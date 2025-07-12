import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  Tool 
} from '@modelcontextprotocol/sdk/types.js';
import { initConnection, closeConnection } from './utils/connection.js';
import { SupabaseConfig } from './types/supabase.js';
import { logger, logError, logInfo } from './utils/logger.js';
import { loadConfig, validateConfig } from './config/env.js';

// Importar todas las herramientas
import { authTools, handleCreateAuthUser, handleListAuthUsers, handleDeleteAuthUser, handleUpdateAuthUser, handleGetAuthUser, handleResetUserPassword } from './tools/auth.js';
import { databaseTools, handleDatabaseQuery, handleCreateTable, handleListTables, handleDescribeTable, handleDropTable, handleCreateIndex } from './tools/database.js';
import { migrationTools, handleCreateMigration, handleListMigrations, handleApplyMigration, handleRollbackMigration, handleGetMigrationStatus } from './tools/migrations.js';
import { storageTools, handleCreateBucket, handleListBuckets, handleUploadFile, handleDownloadFile, handleDeleteFile, handleListFiles } from './tools/storage.js';
import { rlsTools, handleCreateRLSPolicy, handleListRLSPolicies, handleDeleteRLSPolicy, handleEnableRLS, handleDisableRLS } from './tools/rls.js';
import { edgeFunctionTools, handleCreateEdgeFunction, handleListEdgeFunctions, handleDeleteEdgeFunction, handleInvokeEdgeFunction } from './tools/edge-functions.js';
import { realtimeTools, handleCreateRealtimeSubscription, handleListRealtimeSubscriptions, handleDeleteRealtimeSubscription } from './tools/realtime.js';
import { adminTools, handleGetDatabaseStats, handleGetUserStats, handleBackupDatabase, handleRestoreDatabase, handleGetSystemInfo } from './tools/admin.js';
import { logsTools, handleGetLogs, handleGetMetrics, handleGetErrorLogs } from './tools/logs.js';

class SupabaseMCPServer {
  private server: Server;
  private allTools: Tool[];

  constructor() {
    this.server = new Server({
      name: 'supabase-mcp-server',
      version: '1.0.0',
      description: 'Servidor MCP completo para Supabase Self-Hosted'
    });

    // Combinar todas las herramientas
    this.allTools = [
      ...authTools,
      ...databaseTools,
      ...migrationTools,
      ...storageTools,
      ...rlsTools,
      ...edgeFunctionTools,
      ...realtimeTools,
      ...adminTools,
      ...logsTools
    ];

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handler para listar herramientas
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logInfo('Solicitando lista de herramientas');
      return {
        tools: this.allTools
      };
    });

    // Handler para ejecutar herramientas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logInfo(`Ejecutando herramienta: ${name}`);
      
      try {
        switch (name) {
          // Herramientas de autenticación
          case 'create_auth_user':
            return { content: [{ type: 'text', text: JSON.stringify(await handleCreateAuthUser(args)) }] };
          case 'list_auth_users':
            return { content: [{ type: 'text', text: JSON.stringify(await handleListAuthUsers(args)) }] };
          case 'delete_auth_user':
            return { content: [{ type: 'text', text: JSON.stringify(await handleDeleteAuthUser(args)) }] };
          case 'update_auth_user':
            return { content: [{ type: 'text', text: JSON.stringify(await handleUpdateAuthUser(args)) }] };
          case 'get_auth_user':
            return { content: [{ type: 'text', text: JSON.stringify(await handleGetAuthUser(args)) }] };
          case 'reset_user_password':
            return { content: [{ type: 'text', text: JSON.stringify(await handleResetUserPassword(args)) }] };

          // Herramientas de base de datos
          case 'database_query':
            return { content: [{ type: 'text', text: JSON.stringify(await handleDatabaseQuery(args)) }] };
          case 'create_table':
            return { content: [{ type: 'text', text: JSON.stringify(await handleCreateTable(args)) }] };
          case 'list_tables':
            return { content: [{ type: 'text', text: JSON.stringify(await handleListTables(args)) }] };
          case 'describe_table':
            return { content: [{ type: 'text', text: JSON.stringify(await handleDescribeTable(args)) }] };
          case 'drop_table':
            return { content: [{ type: 'text', text: JSON.stringify(await handleDropTable(args)) }] };
          case 'create_index':
            return { content: [{ type: 'text', text: JSON.stringify(await handleCreateIndex(args)) }] };

          // Herramientas de migraciones
          case 'create_migration':
            return { content: [{ type: 'text', text: JSON.stringify(await handleCreateMigration(args)) }] };
          case 'list_migrations':
            return { content: [{ type: 'text', text: JSON.stringify(await handleListMigrations()) }] };
          case 'apply_migration':
            return { content: [{ type: 'text', text: JSON.stringify(await handleApplyMigration(args)) }] };
          case 'rollback_migration':
            return { content: [{ type: 'text', text: JSON.stringify(await handleRollbackMigration(args)) }] };
          case 'get_migration_status':
            return { content: [{ type: 'text', text: JSON.stringify(await handleGetMigrationStatus()) }] };

          // Herramientas de storage
          case 'create_storage_bucket':
            return { content: [{ type: 'text', text: JSON.stringify(await handleCreateBucket(args)) }] };
          case 'list_storage_buckets':
            return { content: [{ type: 'text', text: JSON.stringify(await handleListBuckets()) }] };
          case 'upload_file':
            return { content: [{ type: 'text', text: JSON.stringify(await handleUploadFile(args)) }] };
          case 'download_file':
            return { content: [{ type: 'text', text: JSON.stringify(await handleDownloadFile(args)) }] };
          case 'delete_file':
            return { content: [{ type: 'text', text: JSON.stringify(await handleDeleteFile(args)) }] };
          case 'list_files':
            return { content: [{ type: 'text', text: JSON.stringify(await handleListFiles(args)) }] };

          // Herramientas de RLS
          case 'create_rls_policy':
            return { content: [{ type: 'text', text: JSON.stringify(await handleCreateRLSPolicy(args)) }] };
          case 'list_rls_policies':
            return { content: [{ type: 'text', text: JSON.stringify(await handleListRLSPolicies(args)) }] };
          case 'delete_rls_policy':
            return { content: [{ type: 'text', text: JSON.stringify(await handleDeleteRLSPolicy(args)) }] };
          case 'enable_rls':
            return { content: [{ type: 'text', text: JSON.stringify(await handleEnableRLS(args)) }] };
          case 'disable_rls':
            return { content: [{ type: 'text', text: JSON.stringify(await handleDisableRLS(args)) }] };

          // Herramientas de Edge Functions
          case 'create_edge_function':
            return { content: [{ type: 'text', text: JSON.stringify(await handleCreateEdgeFunction(args)) }] };
          case 'list_edge_functions':
            return { content: [{ type: 'text', text: JSON.stringify(await handleListEdgeFunctions()) }] };
          case 'delete_edge_function':
            return { content: [{ type: 'text', text: JSON.stringify(await handleDeleteEdgeFunction(args)) }] };
          case 'invoke_edge_function':
            return { content: [{ type: 'text', text: JSON.stringify(await handleInvokeEdgeFunction(args)) }] };

          // Herramientas de Realtime
          case 'create_realtime_subscription':
            return { content: [{ type: 'text', text: JSON.stringify(await handleCreateRealtimeSubscription(args)) }] };
          case 'list_realtime_subscriptions':
            return { content: [{ type: 'text', text: JSON.stringify(await handleListRealtimeSubscriptions()) }] };
          case 'delete_realtime_subscription':
            return { content: [{ type: 'text', text: JSON.stringify(await handleDeleteRealtimeSubscription(args)) }] };

          // Herramientas de administración
          case 'get_database_stats':
            return { content: [{ type: 'text', text: JSON.stringify(await handleGetDatabaseStats()) }] };
          case 'get_user_stats':
            return { content: [{ type: 'text', text: JSON.stringify(await handleGetUserStats()) }] };
          case 'backup_database':
            return { content: [{ type: 'text', text: JSON.stringify(await handleBackupDatabase(args)) }] };
          case 'restore_database':
            return { content: [{ type: 'text', text: JSON.stringify(await handleRestoreDatabase(args)) }] };
          case 'get_system_info':
            return { content: [{ type: 'text', text: JSON.stringify(await handleGetSystemInfo()) }] };

          // Herramientas de logs
          case 'get_logs':
            return { content: [{ type: 'text', text: JSON.stringify(await handleGetLogs(args)) }] };
          case 'get_metrics':
            return { content: [{ type: 'text', text: JSON.stringify(await handleGetMetrics(args)) }] };
          case 'get_error_logs':
            return { content: [{ type: 'text', text: JSON.stringify(await handleGetErrorLogs(args)) }] };

          default:
            throw new Error(`Herramienta desconocida: ${name}`);
        }
      } catch (error) {
        logError(error as Error, `tool_${name}`);
        return { 
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              success: false, 
              error: (error as Error).message 
            }) 
          }] 
        };
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logInfo('Servidor MCP de Supabase iniciado');
  }

  async stop(): Promise<void> {
    await closeConnection();
    logInfo('Servidor MCP de Supabase detenido');
  }
}

// Función principal
async function main(): Promise<void> {
  try {
    // Cargar y validar configuración
    const config = loadConfig();
    validateConfig(config);
    
    // Inicializar conexión
    await initConnection(config);
    
    // Crear e iniciar servidor
    const server = new SupabaseMCPServer();
    await server.start();

    // Manejar señales de terminación
    process.on('SIGINT', async () => {
      logInfo('Recibida señal SIGINT, cerrando servidor...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logInfo('Recibida señal SIGTERM, cerrando servidor...');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    logError(error as Error, 'main');
    process.exit(1);
  }
}

// Ejecutar si es el módulo principal
if (require.main === module) {
  main().catch(console.error);
}

export { SupabaseMCPServer };