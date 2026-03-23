const CitasModel = require('../models/citas.model');

function resolveClinicaId(req, bodyClinicaId = null) {
  if (req.user?.rol === 'SUPERADMIN') return bodyClinicaId || req.query?.clinica_id || null;
  return req.user?.clinica_id || req.user?.empresa_id || null;
}

class CitasController {
  static async listar(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const limit = Math.min(Number(req.query?.limit || 100), 500);
      const offset = Number(req.query?.offset || 0);

      const items = await CitasModel.listar({
        clinicaId,
        from: req.query?.from || null,
        to: req.query?.to || null,
        estado: req.query?.estado || null,
        profesionalId: req.query?.profesional_id || null,
        pacienteId: req.query?.paciente_id || null,
        limit,
        offset
      });

      return res.json({ success: true, data: items, count: items.length });
    } catch (error) {
      console.error('Error al listar citas:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async obtenerPorId(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const item = await CitasModel.obtenerPorId({ id: req.params.id, clinicaId });
      if (!item) return res.status(404).json({ success: false, error: 'Cita no encontrada' });

      return res.json({ success: true, data: item });
    } catch (error) {
      console.error('Error al obtener cita:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async crear(req, res) {
    try {
      const clinicaId = resolveClinicaId(req, req.body?.clinica_id);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const item = await CitasModel.crear({
        clinicaId,
        payload: req.body,
        actorUserId: req.user?.id || null
      });

      return res.status(201).json({ success: true, data: item });
    } catch (error) {
      if (error && error.code === '23P01') {
        return res.status(409).json({ success: false, error: 'Conflicto de horario: el profesional ya tiene una cita en ese rango' });
      }

      console.error('Error al crear cita:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async actualizar(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const current = await CitasModel.obtenerPorId({ id: req.params.id, clinicaId });
      if (!current) return res.status(404).json({ success: false, error: 'Cita no encontrada' });

      const updated = await CitasModel.actualizar({ id: req.params.id, clinicaId, payload: req.body });
      if (!updated) return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });

      return res.json({ success: true, data: updated });
    } catch (error) {
      if (error && error.code === '23P01') {
        return res.status(409).json({ success: false, error: 'Conflicto de horario: el profesional ya tiene una cita en ese rango' });
      }

      console.error('Error al actualizar cita:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = CitasController;
