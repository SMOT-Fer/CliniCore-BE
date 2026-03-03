const { Pool } = require('pg');
const logger = require('../utils/logger');

const useSsl = process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: useSsl
    ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
      }
    : false
});

pool.on('connect', () => {
  logger.info('PostgreSQL conectado exitosamente');
});

pool.on('error', (err) => {
  logger.error('Error inesperado en PostgreSQL', { message: err.message });
  process.exit(1);
});

async function query(text, params = []) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    logger.error('Error en SQL Query', {
      query: text,
      params,
      error: error.message
    });
    throw error;
  }
}

async function ping() {
  await query('SELECT 1');
  return true;
}

async function close() {
  try {
    await pool.end();
    logger.info('Conexión a PostgreSQL cerrada');
  } catch (error) {
    logger.error('Error al cerrar la conexión', { message: error.message });
    throw error;
  }
}

async function getClient() {
  return pool.connect();
}

module.exports = { query, ping, close, getClient };
