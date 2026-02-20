const ClinicasModel = require('../models/clinicas.model');

class ClinicasController {
  static async obtenerActivasPublicas(req, res) {
    try {
      const clinicas = await ClinicasModel.obtenerActivasPublicas();
      res.json({ success: true, data: clinicas, count: clinicas.length });
    } catch (error) {
      console.error('Error al obtener clínicas activas públicas:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async obtenerTodas(req, res) {
    try {
      const clinicas = await ClinicasModel.obtenerTodas();

      if (req.user?.rol === 'ADMIN') {
        const propias = clinicas.filter(c => c.id === req.user.clinica_id);
        return res.json({ success: true, data: propias, count: propias.length });
      }

      res.json({ success: true, data: clinicas, count: clinicas.length });
    } catch (error) {
      console.error('Error al obtener clínicas:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async obtenerPorId(req, res) {
    try {
      const { id } = req.params;
      const clinica = await ClinicasModel.obtenerPorId(id);

      if (!clinica) {
        return res.status(404).json({ success: false, error: 'Clínica no encontrada' });
      }

      if (req.user?.rol === 'ADMIN' && clinica.id !== req.user.clinica_id) {
        return res.status(403).json({ success: false, error: 'No autorizado para esta clínica' });
      }

      res.json({ success: true, data: clinica });
    } catch (error) {
      console.error('Error al obtener clínica:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async crear(req, res) {
    try {
      const { nombre, ruc } = req.body;

      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ success: false, error: 'Nombre de clínica requerido' });
      }

      if (ruc) {
        const existe = await ClinicasModel.existeRuc(ruc);
        if (existe) {
          return res.status(409).json({ success: false, error: 'El RUC ya existe en la base de datos' });
        }
      }

      const clinica = await ClinicasModel.crear(req.body);
      res.status(201).json({ success: true, data: clinica });
    } catch (error) {
      console.error('Error al crear clínica:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async actualizar(req, res) {
    try {
      const { id } = req.params;
      const clinicaActual = await ClinicasModel.obtenerPorId(id);

      if (!clinicaActual) {
        return res.status(404).json({ success: false, error: 'Clínica no encontrada' });
      }

      const tieneAlgunCampo = Object.values(req.body).some(value => value !== undefined);
      if (!tieneAlgunCampo) {
        return res.status(400).json({ success: false, error: 'Debe proporcionar al menos un campo para actualizar' });
      }

      if (req.body.ruc && req.body.ruc !== clinicaActual.ruc) {
        const existe = await ClinicasModel.existeRuc(req.body.ruc);
        if (existe) {
          return res.status(409).json({ success: false, error: 'El RUC ya existe en la base de datos' });
        }
      }

      const clinica = await ClinicasModel.actualizar(id, req.body);
      res.json({ success: true, data: clinica });
    } catch (error) {
      console.error('Error al actualizar clínica:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async eliminar(req, res) {
    try {
      const { id } = req.params;
      const clinica = await ClinicasModel.obtenerPorId(id);

      if (!clinica) {
        return res.status(404).json({ success: false, error: 'Clínica no encontrada' });
      }

      // Usar soft delete para cumplimiento legal (healthcare)
      await ClinicasModel.softDelete(id, req.user?.id);
      res.json({ success: true, message: 'Clínica eliminada correctamente' });
    } catch (error) {
      console.error('Error al eliminar clínica:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = ClinicasController;
