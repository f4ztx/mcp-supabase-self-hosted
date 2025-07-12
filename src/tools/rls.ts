import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getConnection } from '../utils/connection.js';
import { validateInput, sanitizeSQLIdentifier } from '../utils/validation.js';
import { CreateRLSPolicyArgs, CreateRLSPolicySchema } from '../types/mcp.js';
import { logError, logInfo } from '../utils/logger.js';

export const rlsTools: Tool[] = [
  {
    name: 'create_rls_policy',
    description: 'Crear una política de Row Level Security',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nombre de la política'
        },
        table: {
          type: 'string',
          description: 'Nombre de la tabla'
        },
        schema: {
          type: 'string',
          description: 'Esquema de la base de datos',
          default: 'public'
        },
        command: {
          type: 'string',
          enum: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'],
          description: 'Comando al que aplicar la política'
        },
        permissive: {
          type: 'boolean',
          description: 'Si la política es permisiva',
          default: true
        },
        roles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Roles a los que aplicar la política',
          default: ['authenticated']
        },
        using: {
          type: 'string',
          description: 'Expresión USING para la política'
        },
        withCheck: {
          type: 'string',
          description: 'Expresión WITH CHECK para la política'
        }
      },
      required: ['name', 'table', 'command']
    }
  },
  {
    name: 'list_rls_policies',
    description: 'Listar todas las políticas RLS de una tabla',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Nombre de la tabla'
        },
        schema: {
          type: 'string',
          description: 'Esquema de la base de datos',
          default: 'public'
        }
      },
      required: ['table']
    }
  },
  {
    name: 'delete_rls_policy',
    description: 'Eliminar una política RLS',
    inputSchema: {
      type: 'object',
      properties: {
        policyName: {
          type: 'string',
          description: 'Nombre de la política'
        },
        table: {
          type: 'string',
          description: 'Nombre de la tabla'
        },
        schema: {
          type: 'string',
          description: 'Esquema de la base de datos',
          default: 'public'
        }
      },
      required: ['policyName', 'table']
    }
  },
  {
    name: 'enable_rls',
    description: 'Habilitar RLS en una tabla',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Nombre de la tabla'
        },
        schema: {
          type: 'string',
          description: 'Esquema de la base de datos',
          default: 'public'
        }
      },
      required: ['table']
    }
  },
  {
    name: 'disable_rls',
    description: 'Deshabilitar RLS en una tabla',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Nombre de la tabla'
        },
        schema: {
          type: 'string',
          description: 'Esquema de la base de datos',
          default: 'public'
        }
      },
      required: ['table']
    }
  }
];

export const handleCreateRLSPolicy = async (args: unknown) => {
  const { name, table, schema, command, permissive, roles, using, withCheck } = validateInput(CreateRLSPolicySchema, args);
  const connection = getConnection();
  
  try {
    const sanitizedName = sanitizeSQLIdentifier(name);
    const sanitizedTable = sanitizeSQLIdentifier(table);
    const sanitizedSchema = sanitizeSQLIdentifier(schema || 'public');
    
    // Construir la consulta CREATE POLICY
    let query = `CREATE POLICY ${sanitizedName} ON ${sanitizedSchema}.${sanitizedTable}`;
    
    if (!permissive) {
      query += ' AS RESTRICTIVE';
    }
    
    query += ` FOR ${command}`;
    
    if (roles && roles.length > 0) {
      query += ` TO ${roles.join(', ')}`;
    }
    
    if (using) {
      query += ` USING (${using})`;
    }
    
    if (withCheck) {
      query += ` WITH CHECK (${withCheck})`;
    }
    
    query += ';';
    
    await connection.getPgClient().query(query);
    
    logInfo(`Política RLS '${name}' creada exitosamente en ${sanitizedSchema}.${sanitizedTable}`);
    
    return {
      success: true,
      message: `Política RLS '${name}' creada exitosamente`
    };
  } catch (error) {
    logError(error as Error, 'create_rls_policy');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleListRLSPolicies = async (args: unknown) => {
  const { table, schema = 'public' } = args as { table: string; schema?: string };
  const connection = getConnection();
  
  try {
    const sanitizedTable = sanitizeSQLIdentifier(table);
    const sanitizedSchema = sanitizeSQLIdentifier(schema);
    
    const query = `
      SELECT 
        p.policyname as name,
        p.permissive,
        p.roles,
        p.cmd as command,
        p.qual as using_expression,
        p.with_check as with_check_expression
      FROM pg_policies p
      JOIN pg_class c ON c.relname = p.tablename
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.tablename = $1 AND n.nspname = $2;
    `;
    
    const result = await connection.getPgClient().query(query, [sanitizedTable, sanitizedSchema]);
    
    return {
      success: true,
      policies: result.rows
    };
  } catch (error) {
    logError(error as Error, 'list_rls_policies');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleDeleteRLSPolicy = async (args: unknown) => {
  const { policyName, table, schema = 'public' } = args as {
    policyName: string;
    table: string;
    schema?: string;
  };
  const connection = getConnection();
  
  try {
    const sanitizedPolicy = sanitizeSQLIdentifier(policyName);
    const sanitizedTable = sanitizeSQLIdentifier(table);
    const sanitizedSchema = sanitizeSQLIdentifier(schema);
    
    const query = `DROP POLICY IF EXISTS ${sanitizedPolicy} ON ${sanitizedSchema}.${sanitizedTable};`;
    
    await connection.getPgClient().query(query);
    
    logInfo(`Política RLS '${policyName}' eliminada exitosamente de ${sanitizedSchema}.${sanitizedTable}`);
    
    return {
      success: true,
      message: `Política RLS '${policyName}' eliminada exitosamente`
    };
  } catch (error) {
    logError(error as Error, 'delete_rls_policy');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleEnableRLS = async (args: unknown) => {
  const { table, schema = 'public' } = args as { table: string; schema?: string };
  const connection = getConnection();
  
  try {
    const sanitizedTable = sanitizeSQLIdentifier(table);
    const sanitizedSchema = sanitizeSQLIdentifier(schema);
    
    const query = `ALTER TABLE ${sanitizedSchema}.${sanitizedTable} ENABLE ROW LEVEL SECURITY;`;
    
    await connection.getPgClient().query(query);
    
    logInfo(`RLS habilitado en ${sanitizedSchema}.${sanitizedTable}`);
    
    return {
      success: true,
      message: `RLS habilitado en ${sanitizedSchema}.${sanitizedTable}`
    };
  } catch (error) {
    logError(error as Error, 'enable_rls');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleDisableRLS = async (args: unknown) => {
  const { table, schema = 'public' } = args as { table: string; schema?: string };
  const connection = getConnection();
  
  try {
    const sanitizedTable = sanitizeSQLIdentifier(table);
    const sanitizedSchema = sanitizeSQLIdentifier(schema);
    
    const query = `ALTER TABLE ${sanitizedSchema}.${sanitizedTable} DISABLE ROW LEVEL SECURITY;`;
    
    await connection.getPgClient().query(query);
    
    logInfo(`RLS deshabilitado en ${sanitizedSchema}.${sanitizedTable}`);
    
    return {
      success: true,
      message: `RLS deshabilitado en ${sanitizedSchema}.${sanitizedTable}`
    };
  } catch (error) {
    logError(error as Error, 'disable_rls');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};