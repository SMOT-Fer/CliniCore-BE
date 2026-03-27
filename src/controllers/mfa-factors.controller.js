const MfaFactorsModel = require('../models/mfa-factors.model');
const { verifyPassword } = require('../utils/password');

const mapMfaError = (error) => {
  if (error?.code === '23505') return { status: 409, message: 'Este factor MFA ya existe' };
  if (error?.code === '23503') return { status: 409, message: 'Usuario no existe' };
  if (error?.code === '22P02') return { status: 400, message: 'ID de factor inválido' };
  return { status: 500, message: 'Error interno del servidor' };
};

class MfaFactorsController {
  static async listar(req, res) {
    try {
      const { usuario_id } = req.body;

      const factores = await MfaFactorsModel.listarPorUsuario({ usuarioId: usuario_id });

      return res.status(200).json({
        success: true,
        data: factores,
      });
    } catch (error) {
      console.error('Error listing mfa factors:', error);
      const { status, message } = mapMfaError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async obtener(req, res) {
    try {
      const { usuario_id } = req.body;
      const { id } = req.params;

      const factor = await MfaFactorsModel.obtenerPorId({ usuarioId: usuario_id, factorId: id });

      if (!factor) {
        return res.status(404).json({ success: false, error: 'Factor MFA no encontrado' });
      }

      return res.status(200).json({
        success: true,
        data: { ...factor, secreto_verificacion: undefined },
      });
    } catch (error) {
      console.error('Error fetching mfa factor:', error);
      const { status, message } = mapMfaError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async crear(req, res) {
    try {
      const { usuario_id } = req.body;
      const payload = req.body.payload;

      const factor = await MfaFactorsModel.crear({ usuarioId: usuario_id, payload });

      return res.status(201).json({
        success: true,
        message: 'Factor MFA creado. Verifica el código antes de completar.',
        data: {
          ...factor,
          secreto_verificacion: payload.secreto_verificacion, // Solo al crear, una sola vez
        },
      });
    } catch (error) {
      console.error('Error creating mfa factor:', error);
      const { status, message } = mapMfaError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async verificar(req, res) {
    try {
      const { usuario_id } = req.body;
      const { id } = req.params;
      const { codigo } = req.body;

      const factor = await MfaFactorsModel.obtenerConSecreto({ usuarioId: usuario_id, factorId: id });

      if (!factor) {
        return res.status(404).json({ success: false, error: 'Factor MFA no encontrado' });
      }

      // En producción: validar código con TOTP library o SMS gateway
      // Por ahora: verificación simple
      if (codigo !== '000000') { // Placeholder
        return res.status(400).json({ success: false, error: 'Código MFA inválido' });
      }

      const verified = await MfaFactorsModel.marcarVerificado({ usuarioId: usuario_id, factorId: id });

      return res.status(200).json({
        success: true,
        message: 'Factor MFA verificado correctamente',
        data: verified,
      });
    } catch (error) {
      console.error('Error verifying mfa factor:', error);
      const { status, message } = mapMfaError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async desactivar(req, res) {
    try {
      const { usuario_id, contrasena_usuario } = req.body;
      const { id } = req.params;

      // Validar contraseña del usuario (para mayor seguridad)
      const usuarioModel = require('../models/usuarios.model');
      const usuario = await usuarioModel.obtenerPorId({ usuarioId: usuario_id });
      if (!usuario || !verifyPassword(contrasena_usuario, usuario.contrasena_hash)) {
        return res.status(403).json({ success: false, error: 'Contraseña inválida' });
      }

      const factor = await MfaFactorsModel.desactivar({ usuarioId: usuario_id, factorId: id });

      if (!factor) {
        return res.status(404).json({ success: false, error: 'Factor MFA no encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Factor MFA desactivado correctamente',
        data: factor,
      });
    } catch (error) {
      console.error('Error deactivating mfa factor:', error);
      const { status, message } = mapMfaError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async eliminar(req, res) {
    try {
      const { usuario_id } = req.body;
      const { id } = req.params;

      const deleted = await MfaFactorsModel.eliminar({ usuarioId: usuario_id, factorId: id });

      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Factor MFA no encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Factor MFA eliminado correctamente',
      });
    } catch (error) {
      console.error('Error deleting mfa factor:', error);
      const { status, message } = mapMfaError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }
}

module.exports = MfaFactorsController;
