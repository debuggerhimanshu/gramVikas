import fs from 'fs';
import path from 'path';
import { getPool, closePool } from '../src/core/database/connection';
import { logger } from '../src/core/utils/logger';

async function runMigration() {
  const schemaDir = path.resolve(__dirname, '../../docs/architecture/schema');
  if (!fs.existsSync(schemaDir)) {
    logger.error(`Schema folder missing at: ${schemaDir}`);
    process.exit(1);
  }

  const sqlFiles = fs
    .readdirSync(schemaDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (sqlFiles.length === 0) {
    logger.error(`No SQL files found in: ${schemaDir}`);
    process.exit(1);
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    for (const file of sqlFiles) {
      const sql = fs.readFileSync(path.join(schemaDir, file), 'utf8');
      await client.query(sql);
    }
    await client.query('COMMIT');
    logger.info(`Applied ${sqlFiles.length} schema migrations successfully.`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Migration failed, rolled back transaction.', { error: (err as Error).message });
    process.exit(1);
  } finally {
    client.release();
    await closePool();
  }
}

runMigration().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
