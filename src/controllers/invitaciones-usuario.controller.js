const InvitacionesUsuarioModel = require('../models/invitaciones-usuario.model');

const mapInvitacionesError = (error) => {
  if (error?.code === '23505') return { status: 409, message: 'Esa invitación ya existe' };
  if (error?.code === '23503') return { status: 409, message: 'Clínica o usuario no existe' };
  if (error?.code === '22P02') return { status: 400, message: 'ID de invitación inválido' };
  return { status: 500, message: 'Error interno del servidor' };
};

class InvitacionesUsuarioController {
  static async listar(req, res) {
    try {
      const { clinicaId } = req.body;
      const filter = req.query;

      const invitaciones = await InvitacionesUsuarioModel.listarPorClinica({ clinicaId, filter });

      return res.status(200).json({
        success: true,
        data: invitaciones,
      });
    } catch (error) {
      console.error('Error listing invitaciones:', error);
      const { status, message } = mapInvitacionesError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async obtener(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const invitacion = await InvitacionesUsuarioModel.obtenerPorId({ clinicaId, invitacionId: id });

      if (!invitacion) {
        return res.status(404).json({ success: false, error: 'Invitación no encontrada' });
      }

      return res.status(200).json({
        success: true,
        data: invitacion,
      });
    } catch (error) {
      console.error('Error fetching invitacion:', error);
      const { status, message } = mapInvitacionesError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async crear(req, res) {
    try {
      const { clinicaId, usuario_id } = req.body;
      const payload = req.body.payload;

      const invitacion = await InvitacionesUsuarioModel.crear({ clinicaId, payload, creadoPor: usuario_id });

      // TODO: Aquí se debería enviar email con link de aceptación
      console.log(`📧 Enviar email a ${invitacion.email} con link de aceptación`);

      return res.status(201).json({
        success: true,
        message: 'Invitación creada y enviada por email',
        data: invitacion,
      });
    } catch (error) {
      console.error('Error creating invitacion:', error);
      const { status, message } = mapInvitacionesError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async aceptar(req, res) {
    try {
      const { token, usuario_id } = req.body;

      const invitacion = await InvitacionesUsuarioModel.obtenerPorToken({ token });

      if (!invitacion) {
        return res.status(404).json({ success: false, error: 'Invitación no encontrada, expirada o ya aceptada' });
      }

      const aceptada = await InvitacionesUsuarioModel.aceptarInvitacion({ invitacionId: invitacion.id, usuarioId: usuario_id });

      return res.status(200).json({
        success: true,
        message: 'Invitación aceptada correctamente',
        data: aceptada,
      });
    } catch (error) {
      console.error('Error accepting invitacion:', error);
      const { status, message } = mapInvitacionesError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async rechazar(req, res) {
    try {
      const { token } = req.body;

      const invitacion = await InvitacionesUsuarioModel.obtenerPorToken({ token });

      if (!invitacion) {
        return res.status(404).json({ success: false, error: 'Invitación no encontrada o expirada' });
      }

      const rechazada = await InvitacionesUsuarioModel.rechazarInvitacion({ invitacionId: invitacion.id });

      return res.status(200).json({
        success: true,
        message: 'Invitación rechazada correctamente',
        data: rechazada,
      });
    } catch (error) {
      console.error('Error rejecting invitacion:', error);
      const { status, message } = mapInvitacionesError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async cancelar(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const cancelada = await InvitacionesUsuarioModel.cancelarInvitacion({ clinicaId, invitacionId: id });

      if (!cancelada) {
        return res.status(404).json({ success: false, error: 'Invitación no encontrada' });
      }

      return res.status(200).json({
        success: true,
        message: 'Invitación cancelada correctamente',
        data: cancelada,
      });
    } catch (error) {
      console.error('Error canceling invitacion:', error);
      const { status, message } = mapInvitacionesError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }
}

module.exports = InvitacionesUsuarioController;
