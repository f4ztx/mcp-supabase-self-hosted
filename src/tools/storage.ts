import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getConnection } from '../utils/connection.js';
import { validateInput } from '../utils/validation.js';
import { CreateStorageBucketArgs, CreateStorageBucketSchema } from '../types/mcp.js';
import { logError, logInfo } from '../utils/logger.js';

export const storageTools: Tool[] = [
  {
    name: 'create_storage_bucket',
    description: 'Crear un nuevo bucket de almacenamiento',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nombre del bucket'
        },
        public: {
          type: 'boolean',
          description: 'Si el bucket es público',
          default: false
        },
        fileSizeLimit: {
          type: 'number',
          description: 'Límite de tamaño de archivo en bytes'
        },
        allowedMimeTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tipos MIME permitidos'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'list_storage_buckets',
    description: 'Listar todos los buckets de almacenamiento',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'upload_file',
    description: 'Subir un archivo al almacenamiento',
    inputSchema: {
      type: 'object',
      properties: {
        bucketName: {
          type: 'string',
          description: 'Nombre del bucket'
        },
        fileName: {
          type: 'string',
          description: 'Nombre del archivo'
        },
        fileData: {
          type: 'string',
          description: 'Datos del archivo en base64'
        },
        contentType: {
          type: 'string',
          description: 'Tipo de contenido del archivo'
        },
        upsert: {
          type: 'boolean',
          description: 'Sobrescribir si existe',
          default: false
        }
      },
      required: ['bucketName', 'fileName', 'fileData']
    }
  },
  {
    name: 'download_file',
    description: 'Descargar un archivo del almacenamiento',
    inputSchema: {
      type: 'object',
      properties: {
        bucketName: {
          type: 'string',
          description: 'Nombre del bucket'
        },
        fileName: {
          type: 'string',
          description: 'Nombre del archivo'
        }
      },
      required: ['bucketName', 'fileName']
    }
  },
  {
    name: 'delete_file',
    description: 'Eliminar un archivo del almacenamiento',
    inputSchema: {
      type: 'object',
      properties: {
        bucketName: {
          type: 'string',
          description: 'Nombre del bucket'
        },
        fileName: {
          type: 'string',
          description: 'Nombre del archivo'
        }
      },
      required: ['bucketName', 'fileName']
    }
  },
  {
    name: 'list_files',
    description: 'Listar archivos en un bucket',
    inputSchema: {
      type: 'object',
      properties: {
        bucketName: {
          type: 'string',
          description: 'Nombre del bucket'
        },
        folder: {
          type: 'string',
          description: 'Carpeta específica',
          default: ''
        },
        limit: {
          type: 'number',
          description: 'Límite de archivos a devolver',
          default: 100
        },
        offset: {
          type: 'number',
          description: 'Offset para paginación',
          default: 0
        }
      },
      required: ['bucketName']
    }
  }
];

export const handleCreateBucket = async (args: unknown) => {
  const { name, public: isPublic, fileSizeLimit, allowedMimeTypes } = validateInput(CreateStorageBucketSchema, args);
  const connection = getConnection();
  
  try {
    const supabase = connection.getSupabaseClient();
    
    const bucketOptions: any = {
      public: isPublic ?? false
    };
    
    if (fileSizeLimit !== undefined) {
      bucketOptions.fileSizeLimit = fileSizeLimit;
    }
    
    if (allowedMimeTypes !== undefined) {
      bucketOptions.allowedMimeTypes = allowedMimeTypes;
    }

    const { data, error } = await supabase.storage.createBucket(name, bucketOptions);
    
    if (error) {
      logError(new Error(error.message), 'create_storage_bucket');
      return {
        success: false,
        error: error.message
      };
    }
    
    logInfo(`Bucket '${name}' creado exitosamente`);
    
    return {
      success: true,
      bucket: data,
      message: `Bucket '${name}' creado exitosamente`
    };
  } catch (error) {
    logError(error as Error, 'create_storage_bucket');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleListBuckets = async () => {
  const connection = getConnection();
  
  try {
    const supabase = connection.getSupabaseClient();
    
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      logError(new Error(error.message), 'list_storage_buckets');
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      buckets: data
    };
  } catch (error) {
    logError(error as Error, 'list_storage_buckets');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleUploadFile = async (args: unknown) => {
  const { bucketName, fileName, fileData, contentType, upsert } = args as {
    bucketName: string;
    fileName: string;
    fileData: string;
    contentType?: string;
    upsert?: boolean;
  };
  const connection = getConnection();
  
  try {
    const supabase = connection.getSupabaseClient();
    
    // Decodificar datos base64
    const buffer = Buffer.from(fileData, 'base64');
    
    const uploadOptions: any = {};
    
    if (contentType !== undefined) {
      uploadOptions.contentType = contentType;
    }
    
    if (upsert !== undefined) {
      uploadOptions.upsert = upsert;
    }
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, uploadOptions);
    
    if (error) {
      logError(new Error(error.message), 'upload_file');
      return {
        success: false,
        error: error.message
      };
    }
    
    logInfo(`Archivo '${fileName}' subido exitosamente al bucket '${bucketName}'`);
    
    return {
      success: true,
      file: data,
      message: `Archivo '${fileName}' subido exitosamente`
    };
  } catch (error) {
    logError(error as Error, 'upload_file');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleDownloadFile = async (args: unknown) => {
  const { bucketName, fileName } = args as {
    bucketName: string;
    fileName: string;
  };
  const connection = getConnection();
  
  try {
    const supabase = connection.getSupabaseClient();
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(fileName);
    
    if (error) {
      logError(new Error(error.message), 'download_file');
      return {
        success: false,
        error: error.message
      };
    }
    
    // Convertir a base64
    const buffer = Buffer.from(await data.arrayBuffer());
    const base64Data = buffer.toString('base64');
    
    return {
      success: true,
      fileName,
      fileData: base64Data,
      contentType: data.type,
      size: data.size
    };
  } catch (error) {
    logError(error as Error, 'download_file');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleDeleteFile = async (args: unknown) => {
  const { bucketName, fileName } = args as {
    bucketName: string;
    fileName: string;
  };
  const connection = getConnection();
  
  try {
    const supabase = connection.getSupabaseClient();
    
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([fileName]);
    
    if (error) {
      logError(new Error(error.message), 'delete_file');
      return {
        success: false,
        error: error.message
      };
    }
    
    logInfo(`Archivo '${fileName}' eliminado exitosamente del bucket '${bucketName}'`);
    
    return {
      success: true,
      message: `Archivo '${fileName}' eliminado exitosamente`
    };
  } catch (error) {
    logError(error as Error, 'delete_file');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

export const handleListFiles = async (args: unknown) => {
  const { bucketName, folder = '', limit = 100, offset = 0 } = args as {
    bucketName: string;
    folder?: string;
    limit?: number;
    offset?: number;
  };
  const connection = getConnection();
  
  try {
    const supabase = connection.getSupabaseClient();
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folder, {
        limit,
        offset
      });
    
    if (error) {
      logError(new Error(error.message), 'list_files');
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      files: data,
      count: data.length
    };
  } catch (error) {
    logError(error as Error, 'list_files');
    return {
      success: false,
      error: (error as Error).message
    };
  }
};