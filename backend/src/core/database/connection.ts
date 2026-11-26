import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from '@config/env';
import { logger } from '@core/utils/logger';

let pool: Pool | null = null;

export const getPool = (): Pool => {
  if (!pool) {
    if (env.DATABASE_URL) {
      pool = new Pool({
        connectionString: env.DATABASE_URL,
        max: env.DB_MAX_CONNECTIONS,
        idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
        connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
      });
    } else {
      pool = new Pool({
        host: env.DB_HOST,
        port: env.DB_PORT,
        database: env.DB_NAME,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        max: env.DB_MAX_CONNECTIONS,
        idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
        connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
      });
    }

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client pool', { error: err.message });
    });
  }
  return pool;
};

export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const p = getPool();
  const start = Date.now();
  try {
    const res = await p.query<T>(text, params);
    const duration = Date.now() - start;
    if (env.NODE_ENV === 'development') {
      logger.debug('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    logger.error('Database query execution error', { text, error: (err as Error).message });
    throw err;
  }
};

export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const res = await query('SELECT 1 as healthy');
    return res.rows[0]?.healthy === 1;
  } catch {
    return false;
  }
};

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('PostgreSQL pool drained and closed.');
  }
};
