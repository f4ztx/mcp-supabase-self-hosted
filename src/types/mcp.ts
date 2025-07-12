import { z } from 'zod';

export const DatabaseQuerySchema = z.object({
  query: z.string(),
  params: z.array(z.any()).optional(),
  schema: z.string().optional().default('public')
});

export const CreateTableSchema = z.object({
  name: z.string(),
  schema: z.string().optional().default('public'),
  columns: z.array(z.object({
    name: z.string(),
    type: z.string(),
    nullable: z.boolean().optional().default(true),
    defaultValue: z.string().optional(),
    isUnique: z.boolean().optional().default(false),
    isPrimaryKey: z.boolean().optional().default(false)
  })),
  enableRLS: z.boolean().optional().default(true)
});

export const CreateMigrationSchema = z.object({
  name: z.string(),
  up: z.string(),
  down: z.string()
});

export const CreateEdgeFunctionSchema = z.object({
  name: z.string(),
  source: z.string(),
  importMap: z.record(z.string()).optional(),
  verifyJWT: z.boolean().optional().default(true)
});

export const CreateRLSPolicySchema = z.object({
  name: z.string(),
  table: z.string(),
  schema: z.string().optional().default('public'),
  command: z.enum(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL']),
  permissive: z.boolean().optional().default(true),
  roles: z.array(z.string()).optional().default(['authenticated']),
  using: z.string().optional(),
  withCheck: z.string().optional()
});

export const CreateStorageBucketSchema = z.object({
  name: z.string(),
  public: z.boolean().optional().default(false),
  fileSizeLimit: z.number().optional(),
  allowedMimeTypes: z.array(z.string()).optional()
});

export const CreateAuthUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  emailConfirm: z.boolean().optional().default(false),
  role: z.string().optional().default('authenticated')
});

export const CreateRealtimeSubscriptionSchema = z.object({
  schema: z.string().optional().default('public'),
  table: z.string(),
  filter: z.string().optional(),
  event: z.enum(['INSERT', 'UPDATE', 'DELETE', '*']).optional().default('*')
});

export type DatabaseQueryArgs = z.infer<typeof DatabaseQuerySchema>;
export type CreateTableArgs = z.infer<typeof CreateTableSchema>;
export type CreateMigrationArgs = z.infer<typeof CreateMigrationSchema>;
export type CreateEdgeFunctionArgs = z.infer<typeof CreateEdgeFunctionSchema>;
export type CreateRLSPolicyArgs = z.infer<typeof CreateRLSPolicySchema>;
export type CreateStorageBucketArgs = z.infer<typeof CreateStorageBucketSchema>;
export type CreateAuthUserArgs = z.infer<typeof CreateAuthUserSchema>;
export type CreateRealtimeSubscriptionArgs = z.infer<typeof CreateRealtimeSubscriptionSchema>;