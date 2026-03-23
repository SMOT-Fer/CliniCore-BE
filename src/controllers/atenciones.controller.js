const AtencionesModel = require('../models/atenciones.model');

function resolveClinicaId(req, bodyClinicaId = null) {
  if (req.user?.rol === 'SUPERADMIN') return bodyClinicaId || req.query?.clinica_id || null;
  return req.user?.clinica_id || req.user?.empresa_id || null;
}

class AtencionesController {
  static async listar(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const limit = Math.min(Number(req.query?.limit || 100), 500);
      const offset = Number(req.query?.offset || 0);

      const items = await AtencionesModel.listar({
        clinicaId,
        pacienteId: req.query?.paciente_id || null,
        profesionalId: req.query?.profesional_id || null,
        from: req.query?.from || null,
        to: req.query?.to || null,
        estado: req.query?.estado || null,
        limit,
        offset
      });

      return res.json({ success: true, data: items, count: items.length });
    } catch (error) {
      console.error('Error al listar atenciones:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async obtenerDetalle(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const item = await AtencionesModel.obtenerDetalle({ id: req.params.id, clinicaId });
      if (!item) return res.status(404).json({ success: false, error: 'Atencion no encontrada' });

      return res.json({ success: true, data: item });
    } catch (error) {
      console.error('Error al obtener detalle de atencion:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async crear(req, res) {
    try {
      const clinicaId = resolveClinicaId(req, req.body?.clinica_id);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const item = await AtencionesModel.crear({
        clinicaId,
        payload: req.body,
        actorUserId: req.user?.id || null
      });

      return res.status(201).json({ success: true, data: item });
    } catch (error) {
      console.error('Error al crear atencion:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async actualizar(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const current = await AtencionesModel.obtenerPorId({ id: req.params.id, clinicaId });
      if (!current) return res.status(404).json({ success: false, error: 'Atencion no encontrada' });

      const item = await AtencionesModel.actualizar({ id: req.params.id, clinicaId, payload: req.body });
      if (!item) return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });

      return res.json({ success: true, data: item });
    } catch (error) {
      console.error('Error al actualizar atencion:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async agregarSignos(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const current = await AtencionesModel.obtenerPorId({ id: req.params.id, clinicaId });
      if (!current) return res.status(404).json({ success: false, error: 'Atencion no encontrada' });

      const signos = await AtencionesModel.agregarSignos({ atencionId: req.params.id, payload: req.body });
      return res.status(201).json({ success: true, data: signos });
    } catch (error) {
      console.error('Error al registrar signos vitales:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async agregarDiagnosticos(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const current = await AtencionesModel.obtenerPorId({ id: req.params.id, clinicaId });
      if (!current) return res.status(404).json({ success: false, error: 'Atencion no encontrada' });

      const rows = await AtencionesModel.agregarDiagnosticos({ atencionId: req.params.id, diagnosticos: req.body.diagnosticos });
      return res.status(201).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error al registrar diagnosticos:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async crearReceta(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const current = await AtencionesModel.obtenerPorId({ id: req.params.id, clinicaId });
      if (!current) return res.status(404).json({ success: false, error: 'Atencion no encontrada' });

      const receta = await AtencionesModel.crearReceta({
        clinicaId,
        atencionId: req.params.id,
        payload: req.body,
        actorUserId: req.user?.id || null
      });

      return res.status(201).json({ success: true, data: receta });
    } catch (error) {
      console.error('Error al crear receta:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = AtencionesController;
