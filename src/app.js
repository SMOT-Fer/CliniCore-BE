const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const db = require('./config/db');
const runtimeState = require('./config/runtime-state');
const swaggerSpec = require('./config/swagger');

const personasRoutes = require('./routes/personas');
const empresasRoutes = require('./routes/empresas');
const tiposNegocioRoutes = require('./routes/tipos-negocio');
const usuariosRoutes = require('./routes/usuarios');
const adminRoutes = require('./routes/admin');
const auditLogsRoutes = require('./routes/audit-logs');
const errorHandler = require('./middlewares/error-handler');
const csrfMiddleware = require('./middlewares/csrf');
const requestLogger = require('./middlewares/request-logger');
const requestId = require('./middlewares/request-id');
const auditContext = require('./middlewares/audit-context');
const { requestTimeout } = require('./middlewares/request-timeout');
const { corsMiddleware, helmetMiddleware } = require('./middlewares/security');
const { globalLimiter } = require('./middlewares/rate-limit');
const { authenticateToken } = require('./middlewares/auth');
const { authorizeRoles } = require('./middlewares/authorize-roles');

const app = express();

app.set('trust proxy', 1);

app.use(requestId);
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(compression()); // Comprime respuestas > 1KB
app.use(globalLimiter);
app.use(requestTimeout(Number(process.env.REQUEST_TIMEOUT_MS || 15000)));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(requestLogger);
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

// Documentación API (Swagger/OpenAPI)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    url: '/api-docs/swagger.json'
  }
}));

app.get('/api-docs/swagger.json', (req, res) => {
  res.json(swaggerSpec);
});

app.get('/', (req, res) => {
  res.redirect('/html/system.html');
});

app.get('/login', (req, res) => {
  res.redirect('/html/login.html');
});

app.get('/healthz', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development'
    }
  });
});

app.get('/api/healthz', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development'
    }
  });
});

async function readinessHandler(req, res) {
  if (runtimeState.isShuttingDown()) {
    return res.status(503).json({
      success: false,
      error: 'Servicio en proceso de apagado',
      data: {
        status: 'not_ready',
        dependencies: {
          database: 'unknown'
        },
        timestamp: new Date().toISOString()
      }
    });
  }

  try {
    await db.ping();

    return res.json({
      success: true,
      data: {
        status: 'ready',
        dependencies: {
          database: 'up'
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      error: 'Servicio no disponible',
      data: {
        status: 'not_ready',
        dependencies: {
          database: 'down'
        },
        timestamp: new Date().toISOString()
      }
    });
  }
}

app.get('/readyz', readinessHandler);
app.get('/api/readyz', readinessHandler);

app.get('/dashboard', authenticateToken, authorizeRoles('SUPERADMIN'), (req, res) => {
  res.redirect('/superadmin');
});

app.get('/superadmin', authenticateToken, authorizeRoles('SUPERADMIN'), (req, res) => {
  res.redirect('/html/superadmin.html');
});

app.use('/api', csrfMiddleware);
app.use('/api', auditContext); // Inyecta contexto de auditoría (user_id)
app.use('/api/personas', personasRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/clinicas', empresasRoutes);
app.use('/api/tipos-negocio', tiposNegocioRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/audit-logs', auditLogsRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Recurso no encontrado',
    requestId: req.requestId
  });
});

app.use(errorHandler);

module.exports = app;
