const FacturasClinicaModel = require('../models/facturas-clinica.model');

const mapFacturasError = (error) => {
  if (error?.code === '23505') return { status: 409, message: 'Ese número de factura ya existe' };
  if (error?.code === '23503') return { status: 409, message: 'Clínica no existe' };
  if (error?.code === '22P02') return { status: 400, message: 'ID de factura inválido' };
  return { status: 500, message: 'Error interno del servidor' };
};

class FacturasClinicaController {
  static async listar(req, res) {
    try {
      const { clinicaId } = req.body;
      const filter = req.query;

      const facturas = await FacturasClinicaModel.listarPorClinica({ clinicaId, filter });

      return res.status(200).json({
        success: true,
        data: facturas,
      });
    } catch (error) {
      console.error('Error listing facturas:', error);
      const { status, message } = mapFacturasError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async obtener(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const factura = await FacturasClinicaModel.obtenerPorId({ clinicaId, facturaId: id });

      if (!factura) {
        return res.status(404).json({ success: false, error: 'Factura no encontrada' });
      }

      return res.status(200).json({
        success: true,
        data: factura,
      });
    } catch (error) {
      console.error('Error fetching factura:', error);
      const { status, message } = mapFacturasError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async crear(req, res) {
    try {
      const { clinicaId } = req.body;
      const payload = req.body.payload;

      const factura = await FacturasClinicaModel.crear({ clinicaId, payload });

      return res.status(201).json({
        success: true,
        data: factura,
      });
    } catch (error) {
      console.error('Error creating factura:', error);
      const { status, message } = mapFacturasError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async actualizar(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;
      const payload = req.body.payload;

      const factura = await FacturasClinicaModel.actualizar({ clinicaId, facturaId: id, payload });

      if (!factura) {
        return res.status(404).json({ success: false, error: 'Factura no encontrada' });
      }

      return res.status(200).json({
        success: true,
        data: factura,
      });
    } catch (error) {
      console.error('Error updating factura:', error);
      const { status, message } = mapFacturasError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async cambiarEstado(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;
      const { nuevo_estado } = req.body;

      const factura = await FacturasClinicaModel.cambiarEstado({ clinicaId, facturaId: id, nuevoEstado: nuevo_estado });

      if (!factura) {
        return res.status(404).json({ success: false, error: 'Factura no encontrada' });
      }

      return res.status(200).json({
        success: true,
        message: `Factura actualizada a estado ${nuevo_estado}`,
        data: factura,
      });
    } catch (error) {
      console.error('Error changing factura estado:', error);
      const { status, message } = mapFacturasError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async eliminar(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const deleted = await FacturasClinicaModel.eliminar({ clinicaId, facturaId: id });

      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Factura no encontrada' });
      }

      return res.status(200).json({
        success: true,
        message: 'Factura eliminada correctamente',
      });
    } catch (error) {
      console.error('Error deleting factura:', error);
      const { status, message } = mapFacturasError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async resumen(req, res) {
    try {
      const { clinicaId } = req.body;

      const summary = await FacturasClinicaModel.sumaryPorEstado({ clinicaId });

      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Error getting factura summary:', error);
      const { status, message } = mapFacturasError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }
}

module.exports = FacturasClinicaController;
