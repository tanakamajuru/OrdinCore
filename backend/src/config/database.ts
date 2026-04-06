import { Pool, PoolConfig } from 'pg';


let pool: Pool | null = null;

export const getPool = () => {
  if (!pool) {
    const config: PoolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ordincore',
      user: process.env.DB_USER || 'ordinuser',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
    pool = new Pool(config);
    pool.on('connect', () => {
      console.log('📦 Connected to PostgreSQL database');
    });
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  return pool;
};

export { pool }; // For existing imports that haven't shifted

export const query = (text: string, params?: unknown[]) => {
  return getPool().query(text, params);
};

export const getClient = () => {
  return getPool().connect();
};

export default getPool;
