const ApiKeysModel = require('../models/api-keys.model');

const mapApiKeysError = (error) => {
  if (error?.code === '23505') return { status: 409, message: 'Esa API key ya existe' };
  if (error?.code === '23503') return { status: 409, message: 'Clínica no existe' };
  if (error?.code === '22P02') return { status: 400, message: 'ID de API key inválido' };
  return { status: 500, message: 'Error interno del servidor' };
};

class ApiKeysController {
  static async listar(req, res) {
    try {
      const { clinicaId } = req.body;
      const filter = req.query;

      const keys = await ApiKeysModel.listarPorClinica({ clinicaId, filter });

      return res.status(200).json({
        success: true,
        data: keys,
      });
    } catch (error) {
      console.error('Error listing api keys:', error);
      const { status, message } = mapApiKeysError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async obtener(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const key = await ApiKeysModel.obtenerPorId({ clinicaId, keyId: id });

      if (!key) {
        return res.status(404).json({ success: false, error: 'API key no encontrada' });
      }

      return res.status(200).json({
        success: true,
        data: key,
      });
    } catch (error) {
      console.error('Error fetching api key:', error);
      const { status, message } = mapApiKeysError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async crear(req, res) {
    try {
      const { clinicaId, usuario_id } = req.body;
      const payload = req.body.payload;

      const key = await ApiKeysModel.crear({ clinicaId, payload, creadoPor: usuario_id });

      return res.status(201).json({
        success: true,
        data: key,
        warning: 'Guarda esta API key en un lugar seguro. No podré mostrarla de nuevo.',
      });
    } catch (error) {
      console.error('Error creating api key:', error);
      const { status, message } = mapApiKeysError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async actualizar(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;
      const payload = req.body.payload;

      const key = await ApiKeysModel.actualizar({ clinicaId, keyId: id, payload });

      if (!key) {
        return res.status(404).json({ success: false, error: 'API key no encontrada' });
      }

      return res.status(200).json({
        success: true,
        data: key,
      });
    } catch (error) {
      console.error('Error updating api key:', error);
      const { status, message } = mapApiKeysError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async revocar(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const key = await ApiKeysModel.revocar({ clinicaId, keyId: id });

      if (!key) {
        return res.status(404).json({ success: false, error: 'API key no encontrada' });
      }

      return res.status(200).json({
        success: true,
        message: 'API key revocada correctamente',
        data: key,
      });
    } catch (error) {
      console.error('Error revoking api key:', error);
      const { status, message } = mapApiKeysError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async eliminar(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const deleted = await ApiKeysModel.eliminar({ clinicaId, keyId: id });

      if (!deleted) {
        return res.status(404).json({ success: false, error: 'API key no encontrada' });
      }

      return res.status(200).json({
        success: true,
        message: 'API key eliminada correctamente',
      });
    } catch (error) {
      console.error('Error deleting api key:', error);
      const { status, message } = mapApiKeysError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }
}

module.exports = ApiKeysController;
