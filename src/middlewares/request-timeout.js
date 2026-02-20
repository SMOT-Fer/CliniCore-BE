function requestTimeout(timeoutMs = 15000) {
  return (req, res, next) => {
    res.setTimeout(timeoutMs, () => {
      if (res.headersSent) {
        return;
      }

      res.status(503).json({
        success: false,
        error: 'Tiempo de espera agotado',
        requestId: req.requestId
      });
    });

    next();
  };
}

module.exports = { requestTimeout };
