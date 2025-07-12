import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getConnection } from '../utils/connection.js';
import { validateInput, sanitizeSQLIdentifier } from '../utils/validation.js';
import { DatabaseQueryArgs, DatabaseQuerySchema, CreateTableArgs, CreateTableSchema } from '../types/mcp.js';
import { logError, logInfo } from '../utils/logger.js';

export const databaseTools: Tool[] = [
  {
    name: 'database_query',
    description: 'Ejecutar consultas SQL en la base de datos de Supabase',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'La consulta SQL a ejecutar'
        },
        params: {
          type: 'array',
          items: { type: 'string' },
          description: 'Parámetros para la consulta SQL'
        },
        schema: {
          type: 'string',
          description: 'Esquema de la base de datos',
          default: 'public'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'create_table',
    description: 'Crear una nueva tabla en la base de datos',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nombre de la tabla'
        },
        schema: {
          type: 'string',
          description: 'Esquema de la base de datos',
          default: 'public'
        },
        columns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              nullable: { type: 'boolean', default: true },
              defaultValue: { type: 'string' },
              isUnique: { type: 'boolean', default: false },
              isPrimaryKey: { type: 'boolean', default: false }
            },
            required: ['name', 'type']
          }
        },
        enableRLS: {
          type: 'boolean',
          description: 'Habilitar Row Level Security',
          default: true
        }
      },
      required: ['name', 'columns']
    }
  },
  {
    name: 'list_tables',
    description: 'Listar todas las tablas en la base de datos',
    inputSchema: {
      type: 'object',
      properties: {
        schema: {
          type: 'string',
          description: 'Esquema de la base de datos',
          default: 'public'
        }
      }
    }
  },
  {
    name: 'describe_table',
    description: 'Obtener información detallada de una tabla',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: 'Nombre de la tabla'
        },
        schema: {
          type: 'string',
          description: 'Esquema de la base de datos',
          default: 'public'
        }
      },
      required: ['tableName']
    }
  },
  {
    name: 'drop_table',
    description: 'Eliminar una tabla de la base de datos',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: 'Nombre de la tabla a eliminar'
        },
        schema: {
          type: 'string',
          description: 'Esquema de la base de datos',
          default: 'public'
        },
        cascade: {
          type: 'boolean',
          description: 'Usar CASCADE para eliminar dependencias',
          default: false
        }
      },
      required: ['tableName']
    }
  },
  {
    name: 'create_index',
    description: 'Crear un índice en una tabla',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: 'Nombre de la tabla'
        },
        columns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Columnas para el índice'
        },
        indexName: {
          type: 'string',
          description: 'Nombre del índice (opcional)'
        },
        unique: {
          type: 'boolean',
          description: 'Crear índice único',
          default: false
        },
        schema: {
          type: 'string',
          description: 'Esquema de la base de datos',
          default: 'public'
        }
      },
      required: ['tableName', 'columns']
    }
  }
];

export const handleDatabaseQuery = async (args: unknown) => {
  const { query, params, schema } = validateInput(DatabaseQuerySchema, args);
  const connection = getConnection();
  
  try {
    logInfo(`Ejecutando consulta en esquema ${schema}: ${query.substring(0, 100)}...`);
    
    const result = await connection.getPgClient().query(query, params);
    
    return {
      success: true,
      rowCount: result.rowCount,
      rows: result.rows,
      command: result.command,
      fields: result.fields?.map(field => ({
        name: field.name,
        dataTypeID: field.dataTypeID
      }))
    };
  } catch (error) {
    logError(error as Error, 'database_query');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleCreateTable = async (args: unknown) => {
  const { name, schema, columns, enableRLS } = validateInput(CreateTableSchema, args);
  const connection = getConnection();
  
  try {
    const sanitizedName = sanitizeSQLIdentifier(name);
    const sanitizedSchema = sanitizeSQLIdentifier(schema || 'public');
    
    // Construir la consulta CREATE TABLE
    const columnDefinitions = columns.map(col => {
      const colName = sanitizeSQLIdentifier(col.name);
      let definition = `${colName} ${col.type}`;
      
      if (!col.nullable) {
        definition += ' NOT NULL';
      }
      
      if (col.defaultValue) {
        definition += ` DEFAULT ${col.defaultValue}`;
      }
      
      if (col.isUnique) {
        definition += ' UNIQUE';
      }
      
      if (col.isPrimaryKey) {
        definition += ' PRIMARY KEY';
      }
      
      return definition;
    }).join(', ');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${sanitizedSchema}.${sanitizedName} (
        ${columnDefinitions}
      );
    `;
    
    await connection.getPgClient().query(createTableQuery);
    
    // Habilitar RLS si se especifica
    if (enableRLS) {
      const enableRLSQuery = `ALTER TABLE ${sanitizedSchema}.${sanitizedName} ENABLE ROW LEVEL SECURITY;`;
      await connection.getPgClient().query(enableRLSQuery);
    }
    
    logInfo(`Tabla ${sanitizedSchema}.${sanitizedName} creada exitosamente`);
    
    return {
      success: true,
      message: `Tabla ${sanitizedSchema}.${sanitizedName} creada exitosamente`,
      rlsEnabled: enableRLS
    };
  } catch (error) {
    logError(error as Error, 'create_table');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleListTables = async (args: unknown) => {
  const { schema = 'public' } = args as { schema?: string };
  const connection = getConnection();
  
  try {
    const sanitizedSchema = sanitizeSQLIdentifier(schema);
    
    const query = `
      SELECT 
        table_name,
        table_type,
        table_schema
      FROM information_schema.tables 
      WHERE table_schema = $1
      ORDER BY table_name;
    `;
    
    const result = await connection.getPgClient().query(query, [sanitizedSchema]);
    
    return {
      success: true,
      tables: result.rows
    };
  } catch (error) {
    logError(error as Error, 'list_tables');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleDescribeTable = async (args: unknown) => {
  const { tableName, schema = 'public' } = args as { tableName: string; schema?: string };
  const connection = getConnection();
  
  try {
    const sanitizedTable = sanitizeSQLIdentifier(tableName);
    const sanitizedSchema = sanitizeSQLIdentifier(schema || 'public');
    
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position;
    `;
    
    const result = await connection.getPgClient().query(query, [sanitizedSchema, sanitizedTable]);
    
    return {
      success: true,
      columns: result.rows
    };
  } catch (error) {
    logError(error as Error, 'describe_table');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleDropTable = async (args: unknown) => {
  const { tableName, schema = 'public', cascade = false } = args as { 
    tableName: string; 
    schema?: string; 
    cascade?: boolean; 
  };
  const connection = getConnection();
  
  try {
    const sanitizedTable = sanitizeSQLIdentifier(tableName);
    const sanitizedSchema = sanitizeSQLIdentifier(schema || 'public');
    
    const query = `DROP TABLE IF EXISTS ${sanitizedSchema}.${sanitizedTable}${cascade ? ' CASCADE' : ''};`;
    
    await connection.getPgClient().query(query);
    
    logInfo(`Tabla ${sanitizedSchema}.${sanitizedTable} eliminada exitosamente`);
    
    return {
      success: true,
      message: `Tabla ${sanitizedSchema}.${sanitizedTable} eliminada exitosamente`
    };
  } catch (error) {
    logError(error as Error, 'drop_table');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleCreateIndex = async (args: unknown) => {
  const { tableName, columns, indexName, unique = false, schema = 'public' } = args as {
    tableName: string;
    columns: string[];
    indexName?: string;
    unique?: boolean;
    schema?: string;
  };
  const connection = getConnection();
  
  try {
    const sanitizedTable = sanitizeSQLIdentifier(tableName);
    const sanitizedSchema = sanitizeSQLIdentifier(schema || 'public');
    const sanitizedColumns = columns.map(col => sanitizeSQLIdentifier(col));
    
    const finalIndexName = indexName || `idx_${sanitizedTable}_${sanitizedColumns.join('_')}`;
    const sanitizedIndexName = sanitizeSQLIdentifier(finalIndexName);
    
    const query = `
      CREATE ${unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS ${sanitizedIndexName}
      ON ${sanitizedSchema}.${sanitizedTable} (${sanitizedColumns.join(', ')});
    `;
    
    await connection.getPgClient().query(query);
    
    logInfo(`Índice ${sanitizedIndexName} creado exitosamente`);
    
    return {
      success: true,
      message: `Índice ${sanitizedIndexName} creado exitosamente`,
      indexName: sanitizedIndexName
    };
  } catch (error) {
    logError(error as Error, 'create_index');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};