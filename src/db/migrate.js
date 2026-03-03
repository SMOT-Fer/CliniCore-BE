const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const logger = require('../utils/logger');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      checksum TEXT,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function getSqlFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.toLowerCase().endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
}

async function runMigrations() {
  const autoMigrate = process.env.AUTO_MIGRATE_DB === 'true';
  if (!autoMigrate) {
    logger.info('AUTO_MIGRATE_DB no habilitado, omitiendo migraciones automáticas');
    return;
  }

  await ensureMigrationsTable();
  const files = getSqlFiles();
  if (files.length === 0) {
    logger.warn('No se encontraron migraciones SQL');
    return;
  }

  const client = await db.getClient();

  try {
    await client.query('SELECT pg_advisory_lock(987654321123456789)');
    const appliedResult = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(appliedResult.rows.map((row) => row.filename));

    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      const sqlPath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO schema_migrations (filename, checksum)
           VALUES ($1, NULL)`,
          [file]
        );
        await client.query('COMMIT');
        logger.info('Migración aplicada', { file });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock(987654321123456789)');
    } finally {
      client.release();
    }
  }
}

module.exports = {
  runMigrations
};
