const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const ALLOWLIST_PATHS = new Set([
  '/usuarios/login',
  '/usuarios/refresh',
  '/usuarios/csrf'
]);

function csrfMiddleware(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (ALLOWLIST_PATHS.has(req.path)) {
    return next();
  }

  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.headers['x-csrf-token'];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ success: false, error: 'CSRF token inválido' });
  }

  return next();
}

module.exports = csrfMiddleware;
