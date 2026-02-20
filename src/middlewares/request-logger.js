const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const inicio = Date.now();

  res.on('finish', () => {
    const duracion = Date.now() - inicio;
    logger.info('HTTP', {
      request_id: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: duracion,
      ip: req.ip
    });
  });

  next();
}

module.exports = requestLogger;
