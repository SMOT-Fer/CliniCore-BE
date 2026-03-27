const ClinicaIntegracionesModel = require('../models/clinica-integraciones.model');

const mapIntegracionesError = (error) => {
  if (error?.code === '23505') return { status: 409, message: 'Esa integración ya existe para esta clínica' };
  if (error?.code === '23503') return { status: 409, message: 'Clínica no existe' };
  if (error?.code === '22P02') return { status: 400, message: 'ID de integración inválido' };
  return { status: 500, message: 'Error interno del servidor' };
};

class ClinicaIntegracionesController {
  static async listar(req, res) {
    try {
      const { clinicaId } = req.body;
      const filter = req.query;

      const integraciones = await ClinicaIntegracionesModel.listarPorClinica({ clinicaId, filter });

      return res.status(200).json({
        success: true,
        data: integraciones,
      });
    } catch (error) {
      console.error('Error listing integraciones:', error);
      const { status, message } = mapIntegracionesError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async obtener(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const integracion = await ClinicaIntegracionesModel.obtenerPorId({ clinicaId, integracionId: id });

      if (!integracion) {
        return res.status(404).json({ success: false, error: 'Integración no encontrada' });
      }

      return res.status(200).json({
        success: true,
        data: integracion,
      });
    } catch (error) {
      console.error('Error fetching integracion:', error);
      const { status, message } = mapIntegracionesError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async crear(req, res) {
    try {
      const { clinicaId } = req.body;
      const payload = req.body.payload;

      const integracion = await ClinicaIntegracionesModel.crear({ clinicaId, payload });

      return res.status(201).json({
        success: true,
        data: integracion,
      });
    } catch (error) {
      console.error('Error creating integracion:', error);
      const { status, message } = mapIntegracionesError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async actualizar(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;
      const payload = req.body.payload;

      const integracion = await ClinicaIntegracionesModel.actualizar({ clinicaId, integracionId: id, payload });

      if (!integracion) {
        return res.status(404).json({ success: false, error: 'Integración no encontrada' });
      }

      return res.status(200).json({
        success: true,
        data: integracion,
      });
    } catch (error) {
      console.error('Error updating integracion:', error);
      const { status, message } = mapIntegracionesError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async eliminar(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const deleted = await ClinicaIntegracionesModel.eliminar({ clinicaId, integracionId: id });

      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Integración no encontrada' });
      }

      return res.status(200).json({
        success: true,
        message: 'Integración eliminada correctamente',
      });
    } catch (error) {
      console.error('Error deleting integracion:', error);
      const { status, message } = mapIntegracionesError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }
}

module.exports = ClinicaIntegracionesController;
