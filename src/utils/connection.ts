import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Client as PgClient } from 'pg';
import { SupabaseConfig } from '../types/supabase.js';
import { logger } from './logger.js';

export class SupabaseConnection {
  private supabaseClient: SupabaseClient;
  private pgClient: PgClient;
  private config: SupabaseConfig;

  constructor(config: SupabaseConfig) {
    this.config = config;
    
    // Crear cliente de Supabase con configuración para self-hosted
    // Según la documentación oficial: usar service role key en ambos headers
    this.supabaseClient = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`
        }
      }
    });
    
    this.pgClient = new PgClient({
      connectionString: config.dbUrl
    });
  }

  async connect(): Promise<void> {
    try {
      await this.pgClient.connect();
      logger.info('Conexión a PostgreSQL establecida');
    } catch (error) {
      logger.error('Error conectando a PostgreSQL', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pgClient.end();
      logger.info('Conexión a PostgreSQL cerrada');
    } catch (error) {
      logger.error('Error cerrando conexión a PostgreSQL', error);
    }
  }

  getSupabaseClient(): SupabaseClient {
    return this.supabaseClient;
  }

  getPgClient(): PgClient {
    return this.pgClient;
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.pgClient.query('SELECT 1');
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error en test de conexión', error);
      return false;
    }
  }

  async getVersion(): Promise<string> {
    try {
      const result = await this.pgClient.query('SELECT version()');
      return result.rows[0]?.version || 'Desconocida';
    } catch (error) {
      logger.error('Error obteniendo versión', error);
      return 'Error';
    }
  }
}

let connection: SupabaseConnection | null = null;

export const getConnection = (): SupabaseConnection => {
  if (!connection) {
    throw new Error('Conexión no inicializada. Llama a initConnection() primero.');
  }
  return connection;
};

export const initConnection = async (config: SupabaseConfig): Promise<SupabaseConnection> => {
  connection = new SupabaseConnection(config);
  await connection.connect();
  return connection;
};

export const closeConnection = async (): Promise<void> => {
  if (connection) {
    await connection.disconnect();
    connection = null;
  }
};