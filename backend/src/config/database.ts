import { Pool, PoolConfig } from 'pg';


let poolInstance: Pool | null = null;

export const getPool = (): Pool => {
  if (!poolInstance) {
    const isProd = process.env.NODE_ENV === 'production';
    // Security (C1): the database password must come exclusively from the environment.
    // No production credential is embedded in source. Fail fast if it is absent in production;
    // a local-dev default is allowed only outside production.
    const password = process.env.DB_PASSWORD ?? (isProd ? undefined : 'postgres');
    if (!password) {
      throw new Error('DB_PASSWORD is required — set it in the environment. Refusing to start.');
    }
    const config: PoolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || (isProd ? 'ordincore' : 'caresignal'),
      user: process.env.DB_USER || (isProd ? 'ordinuser' : 'postgres'),
      password,
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
