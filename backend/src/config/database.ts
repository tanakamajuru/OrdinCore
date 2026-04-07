import { Pool, PoolConfig } from 'pg';


let poolInstance: Pool | null = null;

export const getPool = (): Pool => {
  if (!poolInstance) {
    const isProd = process.env.NODE_ENV === 'production';
    const config: PoolConfig = {
      host: process.env.DB_HOST || (isProd ? 'localhost' : 'localhost'),
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || (isProd ? 'ordincore' : 'caresignal'),
      user: process.env.DB_USER || (isProd ? 'ordinuser' : 'postgres'),
      password: process.env.DB_PASSWORD || (isProd ? 'Highway@1520' : 'postgres'),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
    poolInstance = new Pool(config);
    poolInstance.on('connect', () => {
      console.log('📦 Connected to PostgreSQL database');
    });
    poolInstance.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  return poolInstance;
};

export const query = (text: string, params?: unknown[]) => {
  return getPool().query(text, params);
};

export const getClient = () => {
  return getPool().connect();
};

export default getPool;
