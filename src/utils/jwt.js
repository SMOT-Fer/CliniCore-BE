const jwt = require('jsonwebtoken');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me';
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function generarAccessToken(usuario, sessionId) {
  return jwt.sign(
    {
      sub: usuario.id,
      rol: usuario.rol,
      empresa_id: usuario.empresa_id,
      clinica_id: usuario.empresa_id,
      sid: sessionId
    },
    JWT_ACCESS_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRES_IN }
  );
}

function generarRefreshToken(usuario) {
  return jwt.sign(
    {
      sub: usuario.id,
      rol: usuario.rol,
      empresa_id: usuario.empresa_id,
      clinica_id: usuario.empresa_id
    },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
}

function verificarAccessToken(token) {
  return jwt.verify(token, JWT_ACCESS_SECRET);
}

function verificarRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

module.exports = {
  generarAccessToken,
  generarRefreshToken,
  verificarAccessToken,
  verificarRefreshToken
};
