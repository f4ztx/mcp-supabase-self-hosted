import { SupabaseConfig } from '../types/supabase.js';

export const loadConfig = (): SupabaseConfig => {
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_DB_URL'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Variables de entorno requeridas faltantes: ${missingVars.join(', ')}`);
  }
  
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.replace(/\s+/g, '');
  const anonKey = process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.replace(/\s+/g, '') : '';
  
  return {
    url: process.env.SUPABASE_URL!,
    serviceRoleKey,
    dbUrl: process.env.SUPABASE_DB_URL!,
    jwtSecret: process.env.SUPABASE_JWT_SECRET || '',
    anonKey
  };
};

export const validateConfig = (config: SupabaseConfig): void => {
  const errors: string[] = [];
  
  if (!config.url.startsWith('http')) {
    errors.push('SUPABASE_URL debe ser una URL válida');
  }
  
  if (!config.serviceRoleKey.startsWith('eyJ') && !config.serviceRoleKey.startsWith('eeyJ')) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY debe ser un JWT válido');
  }
  
  if (!config.dbUrl.startsWith('postgresql://')) {
    errors.push('SUPABASE_DB_URL debe ser una URL de PostgreSQL válida');
  }
  
  if (errors.length > 0) {
    throw new Error(`Errores de configuración: ${errors.join(', ')}`);
  }
};