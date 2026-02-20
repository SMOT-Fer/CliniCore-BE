const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const status = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  const isOperational = Boolean(err?.isOperational);
  const shouldExposeDetails = process.env.NODE_ENV !== 'production';

  logger.error('Error no controlado', {
    request_id: req.requestId,
    path: req.originalUrl,
    method: req.method,
    status,
    error: err.message,
    stack: shouldExposeDetails ? err.stack : undefined
  });

  const response = {
    success: false,
    error: status >= 500 ? 'Error interno del servidor' : (err.message || 'Solicitud inválida'),
    requestId: req.requestId
  };

  if (shouldExposeDetails && !isOperational && err?.message) {
    response.details = err.message;
  }

  res.status(status).json(response);
}

module.exports = errorHandler;
