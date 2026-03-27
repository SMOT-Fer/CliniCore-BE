const MetodosPagoClinicaModel = require('../models/metodos-pago-clinica.model');

const mapMetodosError = (error) => {
  if (error?.code === '23505') return { status: 409, message: 'Ese método de pago ya existe' };
  if (error?.code === '23503') return { status: 409, message: 'Clínica no existe' };
  if (error?.code === '22P02') return { status: 400, message: 'ID de método inválido' };
  return { status: 500, message: 'Error interno del servidor' };
};

class MetodosPagoClinicaController {
  static async listar(req, res) {
    try {
      const { clinicaId } = req.body;

      const metodos = await MetodosPagoClinicaModel.listarPorClinica({ clinicaId });

      return res.status(200).json({
        success: true,
        data: metodos,
      });
    } catch (error) {
      console.error('Error listing metodos pago:', error);
      const { status, message } = mapMetodosError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async obtener(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const metodo = await MetodosPagoClinicaModel.obtenerPorId({ clinicaId, metodoId: id });

      if (!metodo) {
        return res.status(404).json({ success: false, error: 'Método de pago no encontrado' });
      }

      return res.status(200).json({
        success: true,
        data: metodo,
      });
    } catch (error) {
      console.error('Error fetching metodo pago:', error);
      const { status, message } = mapMetodosError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async crear(req, res) {
    try {
      const { clinicaId } = req.body;
      const payload = req.body.payload;

      const metodo = await MetodosPagoClinicaModel.crear({ clinicaId, payload });

      return res.status(201).json({
        success: true,
        data: metodo,
      });
    } catch (error) {
      console.error('Error creating metodo pago:', error);
      const { status, message } = mapMetodosError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async actualizar(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;
      const payload = req.body.payload;

      const metodo = await MetodosPagoClinicaModel.actualizar({ clinicaId, metodoId: id, payload });

      if (!metodo) {
        return res.status(404).json({ success: false, error: 'Método de pago no encontrado' });
      }

      return res.status(200).json({
        success: true,
        data: metodo,
      });
    } catch (error) {
      console.error('Error updating metodo pago:', error);
      const { status, message } = mapMetodosError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async eliminar(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const deleted = await MetodosPagoClinicaModel.eliminar({ clinicaId, metodoId: id });

      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Método de pago no encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Método de pago eliminado correctamente',
      });
    } catch (error) {
      console.error('Error deleting metodo pago:', error);
      const { status, message } = mapMetodosError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }
}

module.exports = MetodosPagoClinicaController;
