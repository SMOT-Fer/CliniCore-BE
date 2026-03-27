const PagosClinicaModel = require('../models/pagos-clinica.model');
const FacturasClinicaModel = require('../models/facturas-clinica.model');

const mapPagosError = (error) => {
  if (error?.code === '23503') return { status: 409, message: 'Factura o clínica no existe' };
  if (error?.code === '22P02') return { status: 400, message: 'ID de pago o factura inválido' };
  return { status: 500, message: 'Error interno del servidor' };
};

class PagosClinicaController {
  static async listar(req, res) {
    try {
      const { clinicaId } = req.body;
      const filter = req.query;

      const pagos = await PagosClinicaModel.listarPorClinica({ clinicaId, filter });

      return res.status(200).json({
        success: true,
        data: pagos,
      });
    } catch (error) {
      console.error('Error listing pagos:', error);
      const { status, message } = mapPagosError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async obtener(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const pago = await PagosClinicaModel.obtenerPorId({ clinicaId, pagoId: id });

      if (!pago) {
        return res.status(404).json({ success: false, error: 'Pago no encontrado' });
      }

      return res.status(200).json({
        success: true,
        data: pago,
      });
    } catch (error) {
      console.error('Error fetching pago:', error);
      const { status, message } = mapPagosError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async crear(req, res) {
    try {
      const { clinicaId } = req.body;
      const payload = req.body.payload;

      const pago = await PagosClinicaModel.crear({ clinicaId, payload });

      return res.status(201).json({
        success: true,
        data: pago,
      });
    } catch (error) {
      console.error('Error creating pago:', error);
      const { status, message } = mapPagosError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async actualizar(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;
      const payload = req.body.payload;

      const pago = await PagosClinicaModel.actualizar({ clinicaId, pagoId: id, payload });

      if (!pago) {
        return res.status(404).json({ success: false, error: 'Pago no encontrado' });
      }

      return res.status(200).json({
        success: true,
        data: pago,
      });
    } catch (error) {
      console.error('Error updating pago:', error);
      const { status, message } = mapPagosError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async marcarCompletado(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const pago = await PagosClinicaModel.marcarCompletado({ clinicaId, pagoId: id });

      if (!pago) {
        return res.status(404).json({ success: false, error: 'Pago no encontrado' });
      }

      // Actualizar factura a PAGADA si todos los pagos están completados
      if (pago.factura_id) {
        const numeroFacturaId = pago.factura_id.toString();
        await FacturasClinicaModel.cambiarEstado({ clinicaId, facturaId: numeroFacturaId, nuevoEstado: 'PAGADA' });
      }

      return res.status(200).json({
        success: true,
        message: 'Pago marcado como completado',
        data: pago,
      });
    } catch (error) {
      console.error('Error marking pago completado:', error);
      const { status, message } = mapPagosError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async marcarRechazado(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;
      const { motivo } = req.body;

      const pago = await PagosClinicaModel.marcarRechazado({ clinicaId, pagoId: id, errorMsg: motivo });

      if (!pago) {
        return res.status(404).json({ success: false, error: 'Pago no encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Pago marcado como rechazado',
        data: pago,
      });
    } catch (error) {
      console.error('Error marking pago rechazado:', error);
      const { status, message } = mapPagosError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async eliminar(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const deleted = await PagosClinicaModel.eliminar({ clinicaId, pagoId: id });

      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Pago no encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Pago eliminado correctamente',
      });
    } catch (error) {
      console.error('Error deleting pago:', error);
      const { status, message } = mapPagosError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async resumen(req, res) {
    try {
      const { clinicaId } = req.body;

      const summary = await PagosClinicaModel.sumaryPorEstado({ clinicaId });

      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Error getting pago summary:', error);
      const { status, message } = mapPagosError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }
}

module.exports = PagosClinicaController;
