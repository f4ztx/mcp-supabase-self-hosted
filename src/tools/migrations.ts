import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getConnection } from '../utils/connection.js';
import { validateInput, sanitizeSQLIdentifier } from '../utils/validation.js';
import { CreateMigrationArgs, CreateMigrationSchema } from '../types/mcp.js';
import { logError, logInfo } from '../utils/logger.js';
import { Migration } from '../types/supabase.js';

export const migrationTools: Tool[] = [
  {
    name: 'create_migration',
    description: 'Crear una nueva migración',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nombre de la migración'
        },
        up: {
          type: 'string',
          description: 'SQL para aplicar la migración'
        },
        down: {
          type: 'string',
          description: 'SQL para revertir la migración'
        }
      },
      required: ['name', 'up', 'down']
    }
  },
  {
    name: 'list_migrations',
    description: 'Listar todas las migraciones',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'apply_migration',
    description: 'Aplicar una migración específica',
    inputSchema: {
      type: 'object',
      properties: {
        migrationId: {
          type: 'string',
          description: 'ID de la migración a aplicar'
        }
      },
      required: ['migrationId']
    }
  },
  {
    name: 'rollback_migration',
    description: 'Revertir una migración específica',
    inputSchema: {
      type: 'object',
      properties: {
        migrationId: {
          type: 'string',
          description: 'ID de la migración a revertir'
        }
      },
      required: ['migrationId']
    }
  },
  {
    name: 'get_migration_status',
    description: 'Obtener el estado de las migraciones',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// Asegurar que existe la tabla de migraciones
const ensureMigrationTable = async () => {
  const connection = getConnection();
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS supabase_migrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL UNIQUE,
      up_sql TEXT NOT NULL,
      down_sql TEXT NOT NULL,
      applied BOOLEAN DEFAULT FALSE,
      applied_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  
  await connection.getPgClient().query(createTableQuery);
};

export const handleCreateMigration = async (args: unknown) => {
  const { name, up, down } = validateInput(CreateMigrationSchema, args);
  const connection = getConnection();
  
  try {
    await ensureMigrationTable();
    
    const insertQuery = `
      INSERT INTO supabase_migrations (name, up_sql, down_sql)
      VALUES ($1, $2, $3)
      RETURNING id, name, created_at;
    `;
    
    const result = await connection.getPgClient().query(insertQuery, [name, up, down]);
    
    logInfo(`Migración '${name}' creada exitosamente`);
    
    return {
      success: true,
      migration: result.rows[0],
      message: `Migración '${name}' creada exitosamente`
    };
  } catch (error) {
    logError(error as Error, 'create_migration');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleListMigrations = async () => {
  const connection = getConnection();
  
  try {
    await ensureMigrationTable();
    
    const query = `
      SELECT 
        id,
        name,
        applied,
        applied_at,
        created_at
      FROM supabase_migrations
      ORDER BY created_at ASC;
    `;
    
    const result = await connection.getPgClient().query(query);
    
    return {
      success: true,
      migrations: result.rows
    };
  } catch (error) {
    logError(error as Error, 'list_migrations');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleApplyMigration = async (args: unknown) => {
  const { migrationId } = args as { migrationId: string };
  const connection = getConnection();
  
  try {
    await ensureMigrationTable();
    
    // Obtener la migración
    const getMigrationQuery = `
      SELECT id, name, up_sql, applied
      FROM supabase_migrations
      WHERE id = $1;
    `;
    
    const migrationResult = await connection.getPgClient().query(getMigrationQuery, [migrationId]);
    
    if (migrationResult.rows.length === 0) {
      return {
        success: false,
        error: `Migración con ID '${migrationId}' no encontrada`
      };
    }
    
    const migration = migrationResult.rows[0];
    
    if (migration.applied) {
      return {
        success: false,
        error: `Migración '${migration.name}' ya está aplicada`
      };
    }
    
    // Ejecutar la migración en una transacción
    await connection.getPgClient().query('BEGIN');
    
    try {
      // Ejecutar el SQL de la migración
      await connection.getPgClient().query(migration.up_sql);
      
      // Marcar como aplicada
      const updateQuery = `
        UPDATE supabase_migrations
        SET applied = TRUE, applied_at = NOW()
        WHERE id = $1;
      `;
      
      await connection.getPgClient().query(updateQuery, [migrationId]);
      
      await connection.getPgClient().query('COMMIT');
      
      logInfo(`Migración '${migration.name}' aplicada exitosamente`);
      
      return {
        success: true,
        message: `Migración '${migration.name}' aplicada exitosamente`
      };
    } catch (error) {
      await connection.getPgClient().query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logError(error as Error, 'apply_migration');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleRollbackMigration = async (args: unknown) => {
  const { migrationId } = args as { migrationId: string };
  const connection = getConnection();
  
  try {
    await ensureMigrationTable();
    
    // Obtener la migración
    const getMigrationQuery = `
      SELECT id, name, down_sql, applied
      FROM supabase_migrations
      WHERE id = $1;
    `;
    
    const migrationResult = await connection.getPgClient().query(getMigrationQuery, [migrationId]);
    
    if (migrationResult.rows.length === 0) {
      return {
        success: false,
        error: `Migración con ID '${migrationId}' no encontrada`
      };
    }
    
    const migration = migrationResult.rows[0];
    
    if (!migration.applied) {
      return {
        success: false,
        error: `Migración '${migration.name}' no está aplicada`
      };
    }
    
    // Ejecutar el rollback en una transacción
    await connection.getPgClient().query('BEGIN');
    
    try {
      // Ejecutar el SQL de rollback
      await connection.getPgClient().query(migration.down_sql);
      
      // Marcar como no aplicada
      const updateQuery = `
        UPDATE supabase_migrations
        SET applied = FALSE, applied_at = NULL
        WHERE id = $1;
      `;
      
      await connection.getPgClient().query(updateQuery, [migrationId]);
      
      await connection.getPgClient().query('COMMIT');
      
      logInfo(`Migración '${migration.name}' revertida exitosamente`);
      
      return {
        success: true,
        message: `Migración '${migration.name}' revertida exitosamente`
      };
    } catch (error) {
      await connection.getPgClient().query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logError(error as Error, 'rollback_migration');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleGetMigrationStatus = async () => {
  const connection = getConnection();
  
  try {
    await ensureMigrationTable();
    
    const query = `
      SELECT 
        COUNT(*) as total_migrations,
        COUNT(CASE WHEN applied = TRUE THEN 1 END) as applied_migrations,
        COUNT(CASE WHEN applied = FALSE THEN 1 END) as pending_migrations,
        MAX(applied_at) as last_applied_at
      FROM supabase_migrations;
    `;
    
    const result = await connection.getPgClient().query(query);
    const status = result.rows[0];
    
    return {
      success: true,
      status: {
        totalMigrations: parseInt(status.total_migrations),
        appliedMigrations: parseInt(status.applied_migrations),
        pendingMigrations: parseInt(status.pending_migrations),
        lastAppliedAt: status.last_applied_at
      }
    };
  } catch (error) {
    logError(error as Error, 'get_migration_status');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};