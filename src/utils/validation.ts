import { z } from 'zod';

export const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Validación fallida: ${messages.join(', ')}`);
    }
    throw error;
  }
};

export const isValidSQLIdentifier = (identifier: string): boolean => {
  const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return regex.test(identifier);
};

export const sanitizeSQLIdentifier = (identifier: string): string => {
  if (!isValidSQLIdentifier(identifier)) {
    throw new Error(`Identificador SQL inválido: ${identifier}`);
  }
  return identifier;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

export const isValidJSON = (jsonString: string): boolean => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
};