const OutboxEventosModel = require('../models/outbox-eventos.model');

class OutboxEventosController {
  static async listar(req, res) {
    try {
      const filtro = req.query;
      const eventos = await OutboxEventosModel.listar({ filtro });

      return res.status(200).json({
        success: true,
        data: eventos,
      });
    } catch (error) {
      console.error('Error listing outbox eventos:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async listarSinProcesar(req, res) {
    try {
      const { limite = 100 } = req.query;

      const eventos = await OutboxEventosModel.listarSinProcesar({ limite: parseInt(limite, 10) });

      return res.status(200).json({
        success: true,
        data: eventos,
      });
    } catch (error) {
      console.error('Error listing unprocessed eventos:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async marcarProcesado(req, res) {
    try {
      const { evento_id } = req.body;

      const evento = await OutboxEventosModel.marcarProcesado({ eventoId: evento_id });

      if (!evento) {
        return res.status(404).json({ success: false, error: 'Evento no encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Evento marcado como procesado',
        data: evento,
      });
    } catch (error) {
      console.error('Error marking evento procesado:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async limpiar(req, res) {
    try {
      const { dias_retencion = 90 } = req.body;

      const deletedCount = await OutboxEventosModel.limpiarProcesados({ diasRetencion: dias_retencion });

      return res.status(200).json({
        success: true,
        message: `${deletedCount} eventos antiguos limpiados`,
        cleaned: deletedCount,
      });
    } catch (error) {
      console.error('Error cleaning outbox eventos:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = OutboxEventosController;
