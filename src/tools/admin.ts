import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getConnection } from '../utils/connection.js';
import { logError, logInfo } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

export const adminTools: Tool[] = [
  {
    name: 'get_database_stats',
    description: 'Obtener estadísticas de la base de datos',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_user_stats',
    description: 'Obtener estadísticas de usuarios',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'backup_database',
    description: 'Crear backup de la base de datos',
    inputSchema: {
      type: 'object',
      properties: {
        tables: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tablas específicas a respaldar (opcional)'
        },
        format: {
          type: 'string',
          enum: ['sql', 'json'],
          description: 'Formato del backup',
          default: 'sql'
        }
      }
    }
  },
  {
    name: 'restore_database',
    description: 'Restaurar backup de la base de datos',
    inputSchema: {
      type: 'object',
      properties: {
        backupPath: {
          type: 'string',
          description: 'Ruta del archivo de backup'
        },
        dropExisting: {
          type: 'boolean',
          description: 'Eliminar datos existentes antes de restaurar',
          default: false
        }
      },
      required: ['backupPath']
    }
  },
  {
    name: 'get_system_info',
    description: 'Obtener información del sistema',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

export const handleGetDatabaseStats = async () => {
  const connection = getConnection();
  
  try {
    const queries = [
      // Información general de la base de datos
      `SELECT 
        pg_database.datname,
        pg_database_size(pg_database.datname) AS size_bytes,
        pg_size_pretty(pg_database_size(pg_database.datname)) AS size_pretty
      FROM pg_database
      WHERE datname = current_database();`,
      
      // Número de tablas
      `SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public';`,
      
      // Conexiones activas
      `SELECT 
        COUNT(*) as active_connections,
        COUNT(CASE WHEN state = 'active' THEN 1 END) as active_queries
      FROM pg_stat_activity
      WHERE datname = current_database();`,
      
      // Estadísticas de transacciones
      `SELECT 
        xact_commit,
        xact_rollback,
        blks_read,
        blks_hit,
        tup_returned,
        tup_fetched,
        tup_inserted,
        tup_updated,
        tup_deleted
      FROM pg_stat_database
      WHERE datname = current_database();`
    ];
    
    const [dbInfo, tableCount, connections, transactionStats] = await Promise.all(
      queries.map(query => connection.getPgClient().query(query))
    );
    
    if (!dbInfo?.rows?.[0] || !tableCount?.rows?.[0] || !connections?.rows?.[0] || !transactionStats?.rows?.[0]) {
      throw new Error('Failed to retrieve database statistics');
    }
    
    return {
      success: true,
      stats: {
        database: dbInfo.rows[0],
        tableCount: tableCount.rows[0].table_count,
        connections: connections.rows[0],
        transactions: transactionStats.rows[0]
      }
    };
  } catch (error) {
    logError(error as Error, 'get_database_stats');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleGetUserStats = async () => {
  const connection = getConnection();
  
  try {
    const supabase = connection.getSupabaseClient();
    
    // Obtener estadísticas de usuarios
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw new Error(error.message);
    }
    
    const totalUsers = users.users.length;
    const confirmedUsers = users.users.filter(u => u.email_confirmed_at).length;
    const recentUsers = users.users.filter(u => {
      const createdAt = new Date(u.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdAt > thirtyDaysAgo;
    }).length;
    
    return {
      success: true,
      stats: {
        totalUsers,
        confirmedUsers,
        unconfirmedUsers: totalUsers - confirmedUsers,
        recentUsers,
        confirmationRate: totalUsers > 0 ? (confirmedUsers / totalUsers * 100).toFixed(2) : 0
      }
    };
  } catch (error) {
    logError(error as Error, 'get_user_stats');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleBackupDatabase = async (args: unknown) => {
  const { tables, format = 'sql' } = args as {
    tables?: string[];
    format?: 'sql' | 'json';
  };
  const connection = getConnection();
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    
    // Crear directorio de backups si no existe
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupPath = path.join(backupDir, `backup_${timestamp}.${format}`);
    
    if (format === 'sql') {
      // Backup SQL
      let sqlContent = `-- Backup creado el ${new Date().toISOString()}\n\n`;
      
      // Obtener lista de tablas
      const tablesToBackup = tables || [];
      if (tablesToBackup.length === 0) {
        const tableResult = await connection.getPgClient().query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        `);
        tablesToBackup.push(...tableResult.rows.map(row => row.table_name));
      }
      
      // Generar SQL para cada tabla
      for (const table of tablesToBackup) {
        const result = await connection.getPgClient().query(`SELECT * FROM ${table}`);
        
        if (result.rows.length > 0) {
          const columns = result.fields.map(field => field.name);
          sqlContent += `-- Datos de la tabla ${table}\n`;
          sqlContent += `DELETE FROM ${table};\n`;
          
          for (const row of result.rows) {
            const values = columns.map(col => {
              const value = row[col];
              if (value === null) return 'NULL';
              if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
              return String(value);
            });
            sqlContent += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
          }
          sqlContent += '\n';
        }
      }
      
      fs.writeFileSync(backupPath, sqlContent);
    } else {
      // Backup JSON
      const backupData: any = {
        timestamp: new Date().toISOString(),
        tables: {}
      };
      
      const tablesToBackup = tables || [];
      if (tablesToBackup.length === 0) {
        const tableResult = await connection.getPgClient().query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        `);
        tablesToBackup.push(...tableResult.rows.map(row => row.table_name));
      }
      
      for (const table of tablesToBackup) {
        const result = await connection.getPgClient().query(`SELECT * FROM ${table}`);
        backupData.tables[table] = result.rows;
      }
      
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    }
    
    logInfo(`Backup creado exitosamente: ${backupPath}`);
    
    return {
      success: true,
      backupPath,
      message: `Backup creado exitosamente`
    };
  } catch (error) {
    logError(error as Error, 'backup_database');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleRestoreDatabase = async (args: unknown) => {
  const { backupPath, dropExisting = false } = args as {
    backupPath: string;
    dropExisting?: boolean;
  };
  const connection = getConnection();
  
  try {
    if (!fs.existsSync(backupPath)) {
      return {
        success: false,
        error: `Archivo de backup no encontrado: ${backupPath}`
      };
    }
    
    const backupContent = fs.readFileSync(backupPath, 'utf8');
    const format = path.extname(backupPath).slice(1);
    
    if (format === 'sql') {
      // Restaurar desde SQL
      const statements = backupContent.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim() && !statement.trim().startsWith('--')) {
          await connection.getPgClient().query(statement);
        }
      }
    } else if (format === 'json') {
      // Restaurar desde JSON
      const backupData = JSON.parse(backupContent);
      
      for (const [tableName, rows] of Object.entries(backupData.tables)) {
        if (dropExisting) {
          await connection.getPgClient().query(`DELETE FROM ${tableName}`);
        }
        
        for (const row of rows as any[]) {
          const columns = Object.keys(row);
          const values = columns.map(col => row[col]);
          const placeholders = values.map((_, i) => `$${i + 1}`);
          
          await connection.getPgClient().query(
            `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
            values
          );
        }
      }
    }
    
    logInfo(`Base de datos restaurada exitosamente desde: ${backupPath}`);
    
    return {
      success: true,
      message: `Base de datos restaurada exitosamente`
    };
  } catch (error) {
    logError(error as Error, 'restore_database');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleGetSystemInfo = async () => {
  const connection = getConnection();
  
  try {
    const queries = [
      // Versión de PostgreSQL
      `SELECT version() as postgres_version;`,
      
      // Información del servidor
      `SELECT 
        current_database() as database_name,
        current_user as current_user,
        inet_server_addr() as server_addr,
        inet_server_port() as server_port;`,
      
      // Configuración importante
      `SELECT 
        name,
        setting,
        unit,
        category
      FROM pg_settings
      WHERE name IN (
        'max_connections',
        'shared_buffers',
        'effective_cache_size',
        'maintenance_work_mem',
        'checkpoint_segments',
        'wal_buffers',
        'default_statistics_target'
      );`
    ];
    
    const [version, serverInfo, settings] = await Promise.all(
      queries.map(query => connection.getPgClient().query(query))
    );
    
    if (!version?.rows?.[0] || !serverInfo?.rows?.[0] || !settings?.rows) {
      throw new Error('Failed to retrieve system information');
    }
    
    return {
      success: true,
      systemInfo: {
        version: version.rows[0].postgres_version,
        server: serverInfo.rows[0],
        settings: settings.rows,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    logError(error as Error, 'get_system_info');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};