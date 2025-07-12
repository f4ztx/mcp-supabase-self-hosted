import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getConnection } from '../utils/connection.js';
import { validateInput, isValidEmail, isValidPassword } from '../utils/validation.js';
import { CreateAuthUserArgs, CreateAuthUserSchema } from '../types/mcp.js';
import { logError, logInfo } from '../utils/logger.js';

export const authTools: Tool[] = [
  {
    name: 'create_auth_user',
    description: 'Crear un nuevo usuario de autenticación',
    inputSchema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'Email del usuario'
        },
        password: {
          type: 'string',
          description: 'Contraseña del usuario'
        },
        emailConfirm: {
          type: 'boolean',
          description: 'Confirmar email automáticamente',
          default: false
        },
        role: {
          type: 'string',
          description: 'Rol del usuario',
          default: 'authenticated'
        }
      },
      required: ['email', 'password']
    }
  },
  {
    name: 'list_auth_users',
    description: 'Listar todos los usuarios de autenticación',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Límite de usuarios a devolver',
          default: 100
        },
        offset: {
          type: 'number',
          description: 'Offset para paginación',
          default: 0
        }
      }
    }
  },
  {
    name: 'delete_auth_user',
    description: 'Eliminar un usuario de autenticación',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'ID del usuario a eliminar'
        }
      },
      required: ['userId']
    }
  },
  {
    name: 'update_auth_user',
    description: 'Actualizar un usuario de autenticación',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'ID del usuario'
        },
        email: {
          type: 'string',
          description: 'Nuevo email'
        },
        password: {
          type: 'string',
          description: 'Nueva contraseña'
        },
        emailConfirmed: {
          type: 'boolean',
          description: 'Estado de confirmación de email'
        },
        role: {
          type: 'string',
          description: 'Nuevo rol'
        }
      },
      required: ['userId']
    }
  },
  {
    name: 'get_auth_user',
    description: 'Obtener información de un usuario específico',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'ID del usuario'
        }
      },
      required: ['userId']
    }
  },
  {
    name: 'reset_user_password',
    description: 'Resetear la contraseña de un usuario',
    inputSchema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'Email del usuario'
        }
      },
      required: ['email']
    }
  }
];

export const handleCreateAuthUser = async (args: unknown) => {
  const { email, password, emailConfirm, role } = validateInput(CreateAuthUserSchema, args);
  const connection = getConnection();
  
  try {
    if (!isValidEmail(email)) {
      return {
        success: false,
        error: 'Email inválido'
      };
    }
    
    if (!isValidPassword(password)) {
      return {
        success: false,
        error: 'La contraseña debe tener al menos 8 caracteres'
      };
    }
    
    const supabase = connection.getSupabaseClient();
    
    // Crear usuario usando el cliente admin
    const { data: user, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: emailConfirm ?? false,
      user_metadata: {
        role: role || 'authenticated'
      }
    });
    
    if (error) {
      logError(new Error(error.message), 'create_auth_user');
      return {
        success: false,
        error: error.message
      };
    }
    
    logInfo(`Usuario creado exitosamente: ${email}`);
    
    return {
      success: true,
      user: {
        id: user.user.id,
        email: user.user.email,
        role: user.user.user_metadata?.role || role,
        emailConfirmed: user.user.email_confirmed_at !== null,
        createdAt: user.user.created_at
      },
      message: 'Usuario creado exitosamente'
    };
  } catch (error) {
    logError(error as Error, 'create_auth_user');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleListAuthUsers = async (args: unknown) => {
  const { limit = 100, offset = 0 } = args as { limit?: number; offset?: number };
  const connection = getConnection();
  
  try {
    const supabase = connection.getSupabaseClient();
    
    const { data: users, error } = await supabase.auth.admin.listUsers({
      page: Math.floor(offset / limit) + 1,
      perPage: limit
    });
    
    if (error) {
      logError(new Error(error.message), 'list_auth_users');
      return {
        success: false,
        error: error.message
      };
    }
    
    const formattedUsers = users.users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'authenticated',
      emailConfirmed: user.email_confirmed_at !== null,
      lastSignInAt: user.last_sign_in_at,
      createdAt: user.created_at
    }));
    
    return {
      success: true,
      users: formattedUsers,
      total: users.total || formattedUsers.length
    };
  } catch (error) {
    logError(error as Error, 'list_auth_users');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleDeleteAuthUser = async (args: unknown) => {
  const { userId } = args as { userId: string };
  const connection = getConnection();
  
  try {
    const supabase = connection.getSupabaseClient();
    
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) {
      logError(new Error(error.message), 'delete_auth_user');
      return {
        success: false,
        error: error.message
      };
    }
    
    logInfo(`Usuario eliminado exitosamente: ${userId}`);
    
    return {
      success: true,
      message: 'Usuario eliminado exitosamente'
    };
  } catch (error) {
    logError(error as Error, 'delete_auth_user');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleUpdateAuthUser = async (args: unknown) => {
  const { userId, email, password, emailConfirmed, role } = args as {
    userId: string;
    email?: string;
    password?: string;
    emailConfirmed?: boolean;
    role?: string;
  };
  const connection = getConnection();
  
  try {
    const supabase = connection.getSupabaseClient();
    
    const updateData: any = {};
    
    if (email && isValidEmail(email)) {
      updateData.email = email;
    }
    
    if (password && isValidPassword(password)) {
      updateData.password = password;
    }
    
    if (emailConfirmed !== undefined) {
      updateData.email_confirm = emailConfirmed;
    }
    
    if (role) {
      updateData.user_metadata = { role };
    }
    
    const { data: user, error } = await supabase.auth.admin.updateUserById(userId, updateData);
    
    if (error) {
      logError(new Error(error.message), 'update_auth_user');
      return {
        success: false,
        error: error.message
      };
    }
    
    logInfo(`Usuario actualizado exitosamente: ${userId}`);
    
    return {
      success: true,
      user: {
        id: user.user.id,
        email: user.user.email,
        role: user.user.user_metadata?.role || 'authenticated',
        emailConfirmed: user.user.email_confirmed_at !== null,
        createdAt: user.user.created_at
      },
      message: 'Usuario actualizado exitosamente'
    };
  } catch (error) {
    logError(error as Error, 'update_auth_user');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleGetAuthUser = async (args: unknown) => {
  const { userId } = args as { userId: string };
  const connection = getConnection();
  
  try {
    const supabase = connection.getSupabaseClient();
    
    const { data: user, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error) {
      logError(new Error(error.message), 'get_auth_user');
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      user: {
        id: user.user.id,
        email: user.user.email,
        role: user.user.user_metadata?.role || 'authenticated',
        emailConfirmed: user.user.email_confirmed_at !== null,
        lastSignInAt: user.user.last_sign_in_at,
        createdAt: user.user.created_at
      }
    };
  } catch (error) {
    logError(error as Error, 'get_auth_user');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleResetUserPassword = async (args: unknown) => {
  const { email } = args as { email: string };
  const connection = getConnection();
  
  try {
    if (!isValidEmail(email)) {
      return {
        success: false,
        error: 'Email inválido'
      };
    }
    
    const supabase = connection.getSupabaseClient();
    
    const { error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email
    });
    
    if (error) {
      logError(new Error(error.message), 'reset_user_password');
      return {
        success: false,
        error: error.message
      };
    }
    
    logInfo(`Link de recuperación generado para: ${email}`);
    
    return {
      success: true,
      message: 'Link de recuperación de contraseña generado exitosamente'
    };
  } catch (error) {
    logError(error as Error, 'reset_user_password');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};