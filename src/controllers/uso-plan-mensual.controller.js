const UsoPlanMensualModel = require('../models/uso-plan-mensual.model');

class UsoPlanMensualController {
  static async obtener(req, res) {
    try {
      const { clinicaId } = req.body;

      const uso = await UsoPlanMensualModel.obtenerOCrear({ clinicaId });

      return res.status(200).json({
        success: true,
        data: uso,
      });
    } catch (error) {
      console.error('Error fetching uso plan mensual:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async listar(req, res) {
    try {
      const { clinicaId } = req.body;
      const { meses = 12 } = req.query;

      const histórico = await UsoPlanMensualModel.listarPorClinica({
        clinicaId,
        meses: parseInt(meses, 10),
      });

      return res.status(200).json({
        success: true,
        data: histórico,
      });
    } catch (error) {
      console.error('Error listing uso plan mensual:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async incrementar(req, res) {
    try {
      const { clinicaId } = req.body;
      const { metrica, cantidad = 1 } = req.body;

      const resultado = await UsoPlanMensualModel.incrementarMetrica({
        clinicaId,
        metrica,
        cantidad,
      });

      if (!resultado) {
        return res.status(404).json({ success: false, error: 'Registro no encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: `Métrica ${metrica} incrementada en ${cantidad}`,
        data: resultado,
      });
    } catch (error) {
      console.error('Error incrementing metrica:', error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  static async resumenAnual(req, res) {
    try {
      const { clinicaId } = req.body;
      const { ano = new Date().getFullYear() } = req.query;

      const resumen = await UsoPlanMensualModel.obtenerResumenAnual({
        clinicaId,
        ano: parseInt(ano, 10),
      });

      return res.status(200).json({
        success: true,
        data: resumen,
      });
    } catch (error) {
      console.error('Error getting resumen anual:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = UsoPlanMensualController;
