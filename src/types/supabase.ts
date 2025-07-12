export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
  dbUrl: string;
  jwtSecret: string;
  anonKey: string;
}

export interface DatabaseTable {
  name: string;
  schema: string;
  columns: DatabaseColumn[];
  primaryKey?: string[];
  foreignKeys?: ForeignKey[];
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isUnique?: boolean;
  isIndexed?: boolean;
}

export interface ForeignKey {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}

export interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  applied: boolean;
  appliedAt?: Date;
}

export interface EdgeFunction {
  name: string;
  source: string;
  importMap?: Record<string, string>;
  verify_jwt?: boolean;
}

export interface RLSPolicy {
  name: string;
  table: string;
  schema: string;
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  permissive: boolean;
  roles: string[];
  using?: string;
  withCheck?: string;
}

export interface StorageBucket {
  name: string;
  public: boolean;
  fileSizeLimit?: number;
  allowedMimeTypes?: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  lastSignInAt?: Date;
  emailConfirmed: boolean;
  createdAt: Date;
}

export interface RealtimeSubscription {
  id: string;
  schema: string;
  table: string;
  filter?: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}