const { verificarAccessToken } = require('../utils/jwt');
const UsuariosModel = require('../models/usuarios.model');
const RefreshTokensModel = require('../models/refresh_tokens.model');

const SESSION_IDLE_MINUTES = Number(process.env.SESSION_IDLE_MINUTES || 60);
const SESSION_IDLE_MS = SESSION_IDLE_MINUTES * 60 * 1000;

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;
  const tokenFromCookie = req.cookies?.access_token || null;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Token requerido' });
  }

  try {
    const payload = verificarAccessToken(token);

    if (!payload.sid) {
      return res.status(401).json({ success: false, error: 'Sesión inválida' });
    }

    const sesion = await RefreshTokensModel.obtenerPorId(payload.sid);
    if (!sesion || sesion.revoked_at) {
      return res.status(401).json({ success: false, error: 'Sesión revocada' });
    }

    if (new Date(sesion.expires_at).getTime() < Date.now()) {
      return res.status(401).json({ success: false, error: 'Sesión expirada' });
    }

    const usuario = await UsuariosModel.obtenerPorId(payload.sub);
    if (!usuario) {
      return res.status(401).json({ success: false, error: 'Usuario no válido' });
    }

    if (usuario.estado !== 'ACTIVO') {
      return res.status(401).json({ success: false, error: 'Usuario inactivo' });
    }

    if (usuario.ultimo_login_at) {
      const ultimaActividad = new Date(usuario.ultimo_login_at).getTime();
      const ahora = Date.now();

      if (!Number.isNaN(ultimaActividad) && ahora - ultimaActividad > SESSION_IDLE_MS) {
        return res.status(401).json({
          success: false,
          error: 'Sesión expirada por inactividad'
        });
      }
    }

    const usuarioActualizado = await UsuariosModel.actualizarUltimoLogin(usuario.id);

    req.user = {
      id: usuarioActualizado.id,
      rol: usuarioActualizado.rol,
      empresa_id: usuarioActualizado.empresa_id,
      clinica_id: usuarioActualizado.empresa_id
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
  }
}

module.exports = {
  authenticateToken
};
