import dotenv from 'dotenv';
import path from 'path';
import logger from '../utils/logger';

/**
 * Centralized Environment Configuration Loader
 * Selects the appropriate .env file based on NODE_ENV.
 */
export const loadEnv = () => {
  const env = process.env.NODE_ENV || 'development';
  const envFile = env === 'production' ? '.env.production' : '.env';
  const envPath = path.resolve(process.cwd(), envFile);

  const result = dotenv.config({ path: envPath });

  if (result.error) {
    if (env === 'production') {
      logger.error(`Failed to load ${envFile}:`, result.error);
    } else {
      logger.warn(`Could not find ${envFile}, falling back to system environment variables.`);
    }
  } else {
    logger.info(`🌐 Environment loaded from ${envFile} (${env} mode)`);
  }
};

// Initial load
loadEnv();

export default loadEnv;
