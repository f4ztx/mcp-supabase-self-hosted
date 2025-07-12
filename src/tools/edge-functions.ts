import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getConnection } from '../utils/connection.js';
import { validateInput } from '../utils/validation.js';
import { CreateEdgeFunctionArgs, CreateEdgeFunctionSchema } from '../types/mcp.js';
import { logError, logInfo } from '../utils/logger.js';

export const edgeFunctionTools: Tool[] = [
  {
    name: 'create_edge_function',
    description: 'Crear una nueva Edge Function',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nombre de la función'
        },
        source: {
          type: 'string',
          description: 'Código fuente de la función'
        },
        importMap: {
          type: 'object',
          description: 'Mapa de importaciones',
          additionalProperties: { type: 'string' }
        },
        verifyJWT: {
          type: 'boolean',
          description: 'Verificar JWT en las peticiones',
          default: true
        }
      },
      required: ['name', 'source']
    }
  },
  {
    name: 'list_edge_functions',
    description: 'Listar todas las Edge Functions',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'delete_edge_function',
    description: 'Eliminar una Edge Function',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nombre de la función'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'invoke_edge_function',
    description: 'Invocar una Edge Function',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nombre de la función'
        },
        payload: {
          type: 'object',
          description: 'Payload a enviar a la función',
          additionalProperties: true
        },
        headers: {
          type: 'object',
          description: 'Headers HTTP adicionales',
          additionalProperties: { type: 'string' }
        }
      },
      required: ['name']
    }
  }
];

export const handleCreateEdgeFunction = async (args: unknown) => {
  const { name, source, importMap, verifyJWT } = validateInput(CreateEdgeFunctionSchema, args);
  const connection = getConnection();
  
  try {
    const supabase = connection.getSupabaseClient();
    
    // Note: Edge Functions creation is typically done via CLI, not client SDK
    // This is a placeholder implementation
    logInfo(`Edge Function '${name}' creation requested`);
    
    return {
      success: false,
      error: 'Edge Functions creation is not supported via client SDK. Use Supabase CLI instead.'
    };
  } catch (error) {
    logError(error as Error, 'create_edge_function');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleListEdgeFunctions = async () => {
  const connection = getConnection();
  
  try {
    const supabase = connection.getSupabaseClient();
    
    // Note: Edge Functions listing is typically done via CLI, not client SDK
    logInfo('Edge Functions listing requested');
    
    return {
      success: false,
      error: 'Edge Functions listing is not supported via client SDK. Use Supabase CLI instead.'
    };
  } catch (error) {
    logError(error as Error, 'list_edge_functions');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleDeleteEdgeFunction = async (args: unknown) => {
  const { name } = args as { name: string };
  const connection = getConnection();
  
  try {
    const supabase = connection.getSupabaseClient();
    
    // Note: Edge Functions deletion is typically done via CLI, not client SDK
    logInfo(`Edge Function '${name}' deletion requested`);
    
    return {
      success: false,
      error: 'Edge Functions deletion is not supported via client SDK. Use Supabase CLI instead.'
    };
  } catch (error) {
    logError(error as Error, 'delete_edge_function');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleInvokeEdgeFunction = async (args: unknown) => {
  const { name, payload, headers } = args as {
    name: string;
    payload?: any;
    headers?: Record<string, string>;
  };
  const connection = getConnection();
  
  try {
    const supabase = connection.getSupabaseClient();
    
    const invokeOptions: any = {};
    
    if (payload !== undefined) {
      invokeOptions.body = payload;
    }
    
    if (headers !== undefined) {
      invokeOptions.headers = headers;
    }
    
    // Invocar la función usando la API de Supabase
    const { data, error } = await supabase.functions.invoke(name, invokeOptions);
    
    if (error) {
      logError(new Error(error.message), 'invoke_edge_function');
      return {
        success: false,
        error: error.message
      };
    }
    
    logInfo(`Edge Function '${name}' invocada exitosamente`);
    
    return {
      success: true,
      result: data,
      message: `Edge Function '${name}' invocada exitosamente`
    };
  } catch (error) {
    logError(error as Error, 'invoke_edge_function');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};