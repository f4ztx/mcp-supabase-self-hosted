import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getConnection } from '../utils/connection.js';
import { logError, logInfo } from '../utils/logger.js';

export const logsTools: Tool[] = [
  {
    name: 'get_logs',
    description: 'Obtener logs del sistema',
    inputSchema: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          enum: ['error', 'warn', 'info', 'debug'],
          description: 'Nivel de log a filtrar'
        },
        limit: {
          type: 'number',
          description: 'Límite de logs a devolver',
          default: 100
        },
        startDate: {
          type: 'string',
          description: 'Fecha de inicio (ISO string)'
        },
        endDate: {
          type: 'string',
          description: 'Fecha de fin (ISO string)'
        }
      }
    }
  },
  {
    name: 'get_metrics',
    description: 'Obtener métricas del sistema',
    inputSchema: {
      type: 'object',
      properties: {
        timeRange: {
          type: 'string',
          enum: ['1h', '24h', '7d', '30d'],
          description: 'Rango de tiempo para las métricas',
          default: '1h'
        }
      }
    }
  },
  {
    name: 'get_error_logs',
    description: 'Obtener logs de errores específicos',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Límite de logs a devolver',
          default: 50
        },
        context: {
          type: 'string',
          description: 'Contexto específico del error'
        }
      }
    }
  }
];

export const handleGetLogs = async (args: unknown) => {
  const { level, limit = 100, startDate, endDate } = args as {
    level?: string;
    limit?: number;
    startDate?: string;
    endDate?: string;
  };
  const connection = getConnection();
  
  try {
    // Obtener logs de PostgreSQL
    const pgLogsQuery = `
      SELECT 
        log_time,
        user_name,
        database_name,
        process_id,
        connection_from,
        session_id,
        session_line_num,
        command_tag,
        session_start_time,
        virtual_transaction_id,
        transaction_id,
        error_severity,
        sql_state_code,
        message,
        detail,
        hint,
        internal_query,
        internal_query_pos,
        context,
        query,
        query_pos,
        location,
        application_name
      FROM pg_log
      WHERE 1=1
      ${level ? `AND error_severity = '${level.toUpperCase()}'` : ''}
      ${startDate ? `AND log_time >= '${startDate}'` : ''}
      ${endDate ? `AND log_time <= '${endDate}'` : ''}
      ORDER BY log_time DESC
      LIMIT $1;
    `;
    
    const result = await connection.getPgClient().query(pgLogsQuery, [limit]);
    
    return {
      success: true,
      logs: result.rows,
      count: result.rows.length
    };
  } catch (error) {
    // Si no hay tabla pg_log, devolver logs básicos
    logError(error as Error, 'get_logs');
    
    try {
      // Obtener estadísticas básicas como logs alternativos
      const statsQuery = `
        SELECT 
          NOW() as timestamp,
          'info' as level,
          'Database connection active' as message,
          current_database() as database,
          current_user as user_name
        UNION ALL
        SELECT 
          NOW() as timestamp,
          'info' as level,
          'Statistics retrieved' as message,
          current_database() as database,
          current_user as user_name;
      `;
      
      const result = await connection.getPgClient().query(statsQuery);
      
      return {
        success: true,
        logs: result.rows,
        count: result.rows.length,
        note: 'Logs detallados no disponibles, mostrando información básica'
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: (fallbackError as Error).message
      };
    }
  }
};

export const handleGetMetrics = async (args: unknown) => {
  const { timeRange = '1h' } = args as {
    timeRange?: '1h' | '24h' | '7d' | '30d';
  };
  const connection = getConnection();
  
  try {
    const timeRangeMap = {
      '1h': '1 hour',
      '24h': '1 day',
      '7d': '7 days',
      '30d': '30 days'
    };
    
    const queries = [
      // Métricas de conexiones
      `SELECT 
        COUNT(*) as total_connections,
        COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections,
        COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections
      FROM pg_stat_activity
      WHERE backend_start > NOW() - INTERVAL '${timeRangeMap[timeRange]}';`,
      
      // Métricas de base de datos
      `SELECT 
        numbackends as connections,
        xact_commit as commits,
        xact_rollback as rollbacks,
        blks_read as blocks_read,
        blks_hit as blocks_hit,
        tup_returned as tuples_returned,
        tup_fetched as tuples_fetched,
        tup_inserted as tuples_inserted,
        tup_updated as tuples_updated,
        tup_deleted as tuples_deleted
      FROM pg_stat_database
      WHERE datname = current_database();`,
      
      // Métricas de tabla más activa
      `SELECT 
        schemaname,
        relname as table_name,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        n_tup_ins,
        n_tup_upd,
        n_tup_del
      FROM pg_stat_user_tables
      ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC
      LIMIT 10;`
    ];
    
    const [connections, database, tables] = await Promise.all(
      queries.map(query => connection.getPgClient().query(query))
    );
    
    if (!connections?.rows?.[0] || !database?.rows?.[0] || !tables?.rows) {
      throw new Error('Failed to retrieve metrics data');
    }
    
    return {
      success: true,
      metrics: {
        timeRange,
        connections: connections.rows[0],
        database: database.rows[0],
        topTables: tables.rows,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    logError(error as Error, 'get_metrics');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleGetErrorLogs = async (args: unknown) => {
  const { limit = 50, context } = args as {
    limit?: number;
    context?: string;
  };
  const connection = getConnection();
  
  try {
    // Intentar obtener logs de errores de PostgreSQL
    const errorLogsQuery = `
      SELECT 
        log_time,
        error_severity,
        sql_state_code,
        message,
        detail,
        hint,
        context,
        query,
        application_name
      FROM pg_log
      WHERE error_severity IN ('ERROR', 'FATAL', 'PANIC')
      ${context ? `AND context ILIKE '%${context}%'` : ''}
      ORDER BY log_time DESC
      LIMIT $1;
    `;
    
    const result = await connection.getPgClient().query(errorLogsQuery, [limit]);
    
    return {
      success: true,
      errorLogs: result.rows,
      count: result.rows.length
    };
  } catch (error) {
    logError(error as Error, 'get_error_logs');
    
    // Fallback: obtener errores de conexión y consultas
    try {
      const fallbackQuery = `
        SELECT 
          NOW() as log_time,
          'INFO' as error_severity,
          '00000' as sql_state_code,
          'No error logs table available' as message,
          'Error logging not configured' as detail,
          'Configure pg_log table for detailed error logs' as hint,
          'system' as context,
          NULL as query,
          'supabase-mcp-server' as application_name;
      `;
      
      const result = await connection.getPgClient().query(fallbackQuery);
      
      return {
        success: true,
        errorLogs: result.rows,
        count: result.rows.length,
        note: 'Logs de error detallados no disponibles'
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: (fallbackError as Error).message
      };
    }
  }
};