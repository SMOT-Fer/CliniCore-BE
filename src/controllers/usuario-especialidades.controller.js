const UsuarioEspecialidadesModel = require('../models/usuario-especialidades.model');

const mapEspecialidadesError = (error) => {
  if (error?.code === '23505') return { status: 409, message: 'Esa especialidad ya existe para este usuario' };
  if (error?.code === '23503') return { status: 409, message: 'Usuario no existe' };
  if (error?.code === '22P02') return { status: 400, message: 'ID de especialidad inválido' };
  return { status: 500, message: 'Error interno del servidor' };
};

class UsuarioEspecialidadesController {
  static async listar(req, res) {
    try {
      const { usuario_id } = req.body;

      const especialidades = await UsuarioEspecialidadesModel.listarPorUsuario({ usuarioId: usuario_id });

      return res.status(200).json({
        success: true,
        data: especialidades,
      });
    } catch (error) {
      console.error('Error listing especialidades:', error);
      const { status, message } = mapEspecialidadesError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async obtener(req, res) {
    try {
      const { usuario_id } = req.body;
      const { id } = req.params;

      const especialidad = await UsuarioEspecialidadesModel.obtenerPorId({ usuarioId: usuario_id, especialidadId: id });

      if (!especialidad) {
        return res.status(404).json({ success: false, error: 'Especialidad no encontrada' });
      }

      return res.status(200).json({
        success: true,
        data: especialidad,
      });
    } catch (error) {
      console.error('Error fetching especialidad:', error);
      const { status, message } = mapEspecialidadesError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async crear(req, res) {
    try {
      const { usuario_id } = req.body;
      const payload = req.body.payload;

      const especialidad = await UsuarioEspecialidadesModel.crear({ usuarioId: usuario_id, payload });

      return res.status(201).json({
        success: true,
        data: especialidad,
      });
    } catch (error) {
      console.error('Error creating especialidad:', error);
      const { status, message } = mapEspecialidadesError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async actualizar(req, res) {
    try {
      const { usuario_id } = req.body;
      const { id } = req.params;
      const payload = req.body.payload;

      const especialidad = await UsuarioEspecialidadesModel.actualizar({ usuarioId: usuario_id, especialidadId: id, payload });

      if (!especialidad) {
        return res.status(404).json({ success: false, error: 'Especialidad no encontrada' });
      }

      return res.status(200).json({
        success: true,
        data: especialidad,
      });
    } catch (error) {
      console.error('Error updating especialidad:', error);
      const { status, message } = mapEspecialidadesError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async eliminar(req, res) {
    try {
      const { usuario_id } = req.body;
      const { id } = req.params;

      const deleted = await UsuarioEspecialidadesModel.eliminar({ usuarioId: usuario_id, especialidadId: id });

      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Especialidad no encontrada' });
      }

      return res.status(200).json({
        success: true,
        message: 'Especialidad eliminada correctamente',
      });
    } catch (error) {
      console.error('Error deleting especialidad:', error);
      const { status, message } = mapEspecialidadesError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async listarEspecialistas(req, res) {
    try {
      const { especialidad, clinica_id } = req.query;

      if (!especialidad) {
        return res.status(400).json({ success: false, error: 'Especialidad requerida' });
      }

      const especialistas = await UsuarioEspecialidadesModel.listarEspecialistas({ especialidad, clinicaId: clinica_id });

      return res.status(200).json({
        success: true,
        data: especialistas,
      });
    } catch (error) {
      console.error('Error listing especialistas:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = UsuarioEspecialidadesController;
