const helmet = require('helmet');
const cors = require('cors');

function parseOrigins(originsRaw) {
  return String(originsRaw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const allowedOrigins = parseOrigins(process.env.CORS_ORIGINS);
const isProduction = process.env.NODE_ENV === 'production';
const strictCors = process.env.CORS_STRICT === 'true' || isProduction;

const defaultDevOrigins = [
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5173'
];

const effectiveAllowedOrigins = allowedOrigins.length > 0 ? allowedOrigins : (!strictCors ? defaultDevOrigins : []);

function buildCorsError() {
  const error = new Error('Origen no permitido por CORS');
  error.statusCode = 403;
  error.isOperational = true;
  return error;
}

const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (effectiveAllowedOrigins.includes(origin)) return callback(null, true);
    return callback(buildCorsError());
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  credentials: true,
  maxAge: 86400,
  optionsSuccessStatus: 204
});

const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
});

module.exports = {
  corsMiddleware,
  helmetMiddleware
};
