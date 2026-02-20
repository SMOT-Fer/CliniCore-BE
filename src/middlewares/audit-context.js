const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Middleware para inyectar contexto de auditoría en cada solicitud
 * Establece el user_id de PostgreSQL para triggers
 */
async function auditContext(req, res, next) {
  try {
    // El usuario está en req.user (del middleware de auth)
    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    // Guardar en request para uso en controladores
    req.audit = {
      userId,
      ipAddress,
      userAgent
    };

    // Inyectar user_id en sesión de PostgreSQL para triggers
    // Los triggers usan current_setting('app.user_id') para registrar quién hizo cambios
    if (userId) {
      await db.query("SELECT set_config('app.user_id', $1, false)", [userId]);
    }

    next();
  } catch (error) {
    logger.error('Error en auditContext middleware', { message: error.message });
    // No bloqueamos si falla, pero registramos
    next();
  }
}

module.exports = auditContext;
