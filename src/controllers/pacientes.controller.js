const PacientesModel = require('../models/pacientes.model');

function resolveClinicaId(req, bodyClinicaId = null) {
  if (req.user?.rol === 'SUPERADMIN') return bodyClinicaId || req.query?.clinica_id || null;
  return req.user?.clinica_id || req.user?.empresa_id || null;
}

class PacientesController {
  static async listar(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const limit = Math.min(Number(req.query?.limit || 100), 500);
      const offset = Number(req.query?.offset || 0);

      const items = await PacientesModel.listarPorClinica({
        clinicaId,
        q: req.query?.q || null,
        estado: req.query?.estado || null,
        limit,
        offset
      });

      return res.json({ success: true, data: items, count: items.length });
    } catch (error) {
      console.error('Error al listar pacientes:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async obtenerPorId(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const item = await PacientesModel.obtenerPorId({ id: req.params.id, clinicaId });
      if (!item) return res.status(404).json({ success: false, error: 'Paciente no encontrado' });

      return res.json({ success: true, data: item });
    } catch (error) {
      console.error('Error al obtener paciente:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async crear(req, res) {
    try {
      const clinicaId = resolveClinicaId(req, req.body?.clinica_id);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const existe = await PacientesModel.existePersonaEnClinica({ personaId: req.body.persona_id, clinicaId });
      if (existe) {
        return res.status(409).json({ success: false, error: 'La persona ya esta registrada como paciente en la clinica' });
      }

      const item = await PacientesModel.crearConHistoria({
        clinicaId,
        payload: req.body,
        actorUserId: req.user?.id || null
      });

      return res.status(201).json({ success: true, data: item });
    } catch (error) {
      console.error('Error al crear paciente:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async actualizar(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const actual = await PacientesModel.obtenerPorId({ id: req.params.id, clinicaId });
      if (!actual) return res.status(404).json({ success: false, error: 'Paciente no encontrado' });

      const updated = await PacientesModel.actualizar({ id: req.params.id, clinicaId, payload: req.body });
      if (!updated) return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });

      const full = await PacientesModel.obtenerPorId({ id: req.params.id, clinicaId });
      return res.json({ success: true, data: full });
    } catch (error) {
      console.error('Error al actualizar paciente:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async desactivar(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const updated = await PacientesModel.softDelete({
        id: req.params.id,
        clinicaId,
        actorUserId: req.user?.id || null
      });

      if (!updated) return res.status(404).json({ success: false, error: 'Paciente no encontrado o ya desactivado' });
      return res.json({ success: true, data: updated, message: 'Paciente desactivado correctamente' });
    } catch (error) {
      console.error('Error al desactivar paciente:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async reactivar(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const updated = await PacientesModel.reactivar({ id: req.params.id, clinicaId });
      if (!updated) return res.status(404).json({ success: false, error: 'Paciente no encontrado' });

      return res.json({ success: true, data: updated, message: 'Paciente reactivado correctamente' });
    } catch (error) {
      console.error('Error al reactivar paciente:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = PacientesController;
