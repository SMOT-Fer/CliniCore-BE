const crypto = require('crypto');

function requestId(req, res, next) {
  const incomingRequestId = req.headers['x-request-id'];
  const requestIdValue = typeof incomingRequestId === 'string' && incomingRequestId.trim()
    ? incomingRequestId.trim()
    : crypto.randomUUID();

  req.requestId = requestIdValue;
  res.setHeader('x-request-id', requestIdValue);

  next();
}

module.exports = requestId;