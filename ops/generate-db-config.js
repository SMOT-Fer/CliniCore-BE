#!/usr/bin/env node

/**
 * Script para generar database.json desde variables de entorno
 * db-migrate no soporta variables de entorno directamente, así que generamos el config
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL no está definido en .env');
  process.exit(1);
}

// Parsear DATABASE_URL (formato: postgresql://user:password@host:port/database)
const urlRegex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
const match = databaseUrl.match(urlRegex);

if (!match) {
  console.error('ERROR: DATABASE_URL inválido');
  process.exit(1);
}

const [, user, password, host, port, database] = match;

const config = {
  dev: {
    driver: 'pg',
    user,
    password,
    host,
    port: parseInt(port, 10),
    database,
    schema: 'public'
  },
  production: {
    driver: 'pg',
    user,
    password,
    host,
    port: parseInt(port, 10),
    database,
    schema: 'public',
    ssl: true
  }
};

const configPath = path.join(__dirname, 'database.json');

try {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('✓ database.json generado correctamente');
} catch (error) {
  console.error('ERROR al escribir database.json:', error.message);
  process.exit(1);
}
