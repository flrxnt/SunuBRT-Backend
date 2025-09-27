import { PrismaClientOptions } from '@prisma/client/runtime/library';

export const databaseConfig: PrismaClientOptions = {
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  errorFormat: 'pretty',
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

export const getDatabaseUrl = (): string => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return databaseUrl;
};

export const validateDatabaseConnection = async (
  prisma: any,
): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  ssl: boolean;
}

export const getFullDatabaseConfig = (): DatabaseConfig => {
  return {
    url: getDatabaseUrl(),
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '600000'),
    ssl: process.env.NODE_ENV === 'production',
  };
};
