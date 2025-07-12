import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getConnection } from '../utils/connection.js';
import { validateInput } from '../utils/validation.js';
import { CreateRealtimeSubscriptionArgs, CreateRealtimeSubscriptionSchema } from '../types/mcp.js';
import { logError, logInfo } from '../utils/logger.js';

export const realtimeTools: Tool[] = [
  {
    name: 'create_realtime_subscription',
    description: 'Crear una suscripción en tiempo real',
    inputSchema: {
      type: 'object',
      properties: {
        schema: {
          type: 'string',
          description: 'Esquema de la base de datos',
          default: 'public'
        },
        table: {
          type: 'string',
          description: 'Nombre de la tabla'
        },
        filter: {
          type: 'string',
          description: 'Filtro para la suscripción'
        },
        event: {
          type: 'string',
          enum: ['INSERT', 'UPDATE', 'DELETE', '*'],
          description: 'Tipo de evento a escuchar',
          default: '*'
        }
      },
      required: ['table']
    }
  },
  {
    name: 'list_realtime_subscriptions',
    description: 'Listar todas las suscripciones en tiempo real',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'delete_realtime_subscription',
    description: 'Eliminar una suscripción en tiempo real',
    inputSchema: {
      type: 'object',
      properties: {
        subscriptionId: {
          type: 'string',
          description: 'ID de la suscripción'
        }
      },
      required: ['subscriptionId']
    }
  }
];

// Almacenar suscripciones activas
const activeSubscriptions = new Map<string, any>();

export const handleCreateRealtimeSubscription = async (args: unknown) => {
  const { schema, table, filter, event } = validateInput(CreateRealtimeSubscriptionSchema, args);
  const connection = getConnection();
  
  try {
    const supabase = connection.getSupabaseClient();
    
    // Crear el canal de suscripción
    let channel = supabase.channel(`${schema}:${table}`);
    
    // Configurar el listener según el evento
    if (event === '*') {
      channel = channel.on('postgres_changes' as any, {
        event: '*',
        schema: schema,
        table: table,
        filter: filter
      }, (payload: any) => {
        logInfo(`Evento recibido en ${schema}.${table}: ${JSON.stringify(payload)}`);
      });
    } else {
      channel = channel.on('postgres_changes' as any, {
        event: event,
        schema: schema,
        table: table,
        filter: filter
      }, (payload: any) => {
        logInfo(`Evento ${event} recibido en ${schema}.${table}: ${JSON.stringify(payload)}`);
      });
    }
    
    // Suscribirse al canal
    const subscription = channel.subscribe();
    
    // Generar ID único para la suscripción
    const subscriptionId = `${schema}_${table}_${Date.now()}`;
    
    // Almacenar la suscripción
    activeSubscriptions.set(subscriptionId, {
      channel,
      subscription,
      schema,
      table,
      event,
      filter,
      createdAt: new Date()
    });
    
    logInfo(`Suscripción en tiempo real creada: ${subscriptionId}`);
    
    return {
      success: true,
      subscriptionId,
      message: `Suscripción en tiempo real creada exitosamente`
    };
  } catch (error) {
    logError(error as Error, 'create_realtime_subscription');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleListRealtimeSubscriptions = async () => {
  try {
    const subscriptions = Array.from(activeSubscriptions.entries()).map(([id, sub]) => ({
      id,
      schema: sub.schema,
      table: sub.table,
      event: sub.event,
      filter: sub.filter,
      createdAt: sub.createdAt
    }));
    
    return {
      success: true,
      subscriptions
    };
  } catch (error) {
    logError(error as Error, 'list_realtime_subscriptions');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleDeleteRealtimeSubscription = async (args: unknown) => {
  const { subscriptionId } = args as { subscriptionId: string };
  
  try {
    const subscription = activeSubscriptions.get(subscriptionId);
    
    if (!subscription) {
      return {
        success: false,
        error: `Suscripción con ID '${subscriptionId}' no encontrada`
      };
    }
    
    // Cancelar la suscripción
    await subscription.channel.unsubscribe();
    
    // Eliminar de la lista activa
    activeSubscriptions.delete(subscriptionId);
    
    logInfo(`Suscripción en tiempo real eliminada: ${subscriptionId}`);
    
    return {
      success: true,
      message: `Suscripción eliminada exitosamente`
    };
  } catch (error) {
    logError(error as Error, 'delete_realtime_subscription');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};