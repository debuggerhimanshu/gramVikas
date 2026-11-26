import fs from 'fs';
import path from 'path';
import { getPool, closePool } from '../src/core/database/connection';
import { logger } from '../src/core/utils/logger';

async function runSeed() {
  const seedsDir = path.resolve(__dirname, '../../docs/architecture/seeds');
  if (!fs.existsSync(seedsDir)) {
    logger.error(`Seeds folder missing at: ${seedsDir}`);
    process.exit(1);
  }

  const sqlFiles = fs
    .readdirSync(seedsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (sqlFiles.length === 0) {
    logger.error(`No seed files found in: ${seedsDir}`);
    process.exit(1);
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    for (const file of sqlFiles) {
      const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
      await client.query(sql);
    }
    await client.query('COMMIT');
    logger.info(`Applied ${sqlFiles.length} seed file(s) successfully.`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Database seeding failed, rolled back transaction.', { error: (err as Error).message });
    process.exit(1);
  } finally {
    client.release();
    await closePool();
  }
}

runSeed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
