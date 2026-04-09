const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const db = require('./config/db');
const runtimeState = require('./config/runtime-state');
const swaggerSpec = require('./config/swagger');

const personasRoutes = require('./routes/personas');
const clinicasRoutes = require('./routes/empresas');
const tiposNegocioRoutes = require('./routes/tipos-negocio');
const usuariosRoutes = require('./routes/usuarios');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const auditLogsRoutes = require('./routes/audit-logs');
const platformRoutes = require('./routes/platform');
const pacientesRoutes = require('./routes/pacientes');
const citasRoutes = require('./routes/citas');
const atencionesRoutes = require('./routes/atenciones');
const clinicaConfiguracionRoutes = require('./routes/clinica-configuracion');
const clinicaDominiosRoutes = require('./routes/clinica-dominios');
const clinicaIntegracionesRoutes = require('./routes/clinica-integraciones');
const facturasClinicaRoutes = require('./routes/facturas-clinica');
const pagosClinicaRoutes = require('./routes/pagos-clinica');
const webhookEventosPagoRoutes = require('./routes/webhook-eventos-pago');
const apiKeysRoutes = require('./routes/api-keys');
const mfaFactorsRoutes = require('./routes/mfa-factors');
const mfaChallengesRoutes = require('./routes/mfa-challenges');
const invitacionesUsuarioRoutes = require('./routes/invitaciones-usuario');
const usuarioEspecialidadesRoutes = require('./routes/usuario-especialidades');
const recetasMedicasRoutes = require('./routes/recetas-medicas');
const metodosPagoClinicaRoutes = require('./routes/metodos-pago-clinica');
const outboxEventosRoutes = require('./routes/outbox-eventos');
const usoPlanMensualRoutes = require('./routes/uso-plan-mensual');
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

app.use('/api', csrfMiddleware);
app.use('/api', auditContext); // Inyecta contexto de auditoría (user_id)
app.use('/api/auth', authRoutes); // Rutas de autenticación (registro, recuperación, OAuth)
app.use('/api/personas', personasRoutes);
app.use('/api/clinicas', clinicasRoutes);
app.use('/api/empresas', clinicasRoutes); // legacy alias
app.use('/api/tipos-negocio', tiposNegocioRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/atenciones', atencionesRoutes);
app.use('/api/clinica-configuracion', clinicaConfiguracionRoutes);
app.use('/api/clinica-dominios', clinicaDominiosRoutes);
app.use('/api/clinica-integraciones', clinicaIntegracionesRoutes);
app.use('/api/facturas-clinica', facturasClinicaRoutes);
app.use('/api/pagos-clinica', pagosClinicaRoutes);
app.use('/api/webhook-eventos-pago', webhookEventosPagoRoutes);
app.use('/api/api-keys', apiKeysRoutes);
app.use('/api/mfa-factors', mfaFactorsRoutes);
app.use('/api/mfa-challenges', mfaChallengesRoutes);
app.use('/api/invitaciones-usuario', invitacionesUsuarioRoutes);
app.use('/api/usuario-especialidades', usuarioEspecialidadesRoutes);
app.use('/api/recetas-medicas', recetasMedicasRoutes);
app.use('/api/metodos-pago-clinica', metodosPagoClinicaRoutes);
app.use('/api/outbox-eventos', outboxEventosRoutes);
app.use('/api/uso-plan-mensual', usoPlanMensualRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Recurso no encontrado',
    requestId: req.requestId
  });
});

app.use(errorHandler);

module.exports = app;
