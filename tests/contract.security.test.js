const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'production';
process.env.CORS_ORIGINS = 'https://app.example.com';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/db';

const app = require('../src/app');
const runtimeState = require('../src/config/runtime-state');

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('GET /healthz responde 200 y agrega x-request-id', async () => {
  const response = await fetch(`${baseUrl}/healthz`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'ok');
  assert.ok(response.headers.get('x-request-id'));
});

test('CORS permite origen configurado', async () => {
  const response = await fetch(`${baseUrl}/healthz`, {
    headers: {
      Origin: 'https://app.example.com'
    }
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://app.example.com');
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
});

test('CORS bloquea origen no permitido con 403', async () => {
  const response = await fetch(`${baseUrl}/healthz`, {
    headers: {
      Origin: 'https://evil.example.com'
    }
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Origen no permitido por CORS');
  assert.ok(body.requestId);
});

test('Preflight OPTIONS retorna 204 para origen permitido', async () => {
  const response = await fetch(`${baseUrl}/healthz`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://app.example.com',
      'Access-Control-Request-Method': 'GET'
    }
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://app.example.com');
});

test('GET /readyz responde 503 cuando base de datos no está disponible', async () => {
  const response = await fetch(`${baseUrl}/readyz`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Servicio no disponible');
  assert.equal(body.data.status, 'not_ready');
});

test('GET /readyz responde 503 cuando el servicio está en apagado controlado', async () => {
  runtimeState.setShuttingDown(true);

  const response = await fetch(`${baseUrl}/readyz`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Servicio en proceso de apagado');
  assert.equal(body.data.status, 'not_ready');

  runtimeState.setShuttingDown(false);
});