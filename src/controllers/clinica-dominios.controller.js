const ClinicaDominiosModel = require('../models/clinica-dominios.model');

function resolveClinicaId(req, inputClinicaId = null) {
  if (req.user?.rol === 'SUPERADMIN') return inputClinicaId || req.query?.clinica_id || null;
  return req.user?.clinica_id || req.user?.empresa_id || null;
}

class ClinicaDominiosController {
  static async listar(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const data = await ClinicaDominiosModel.listarPorClinica(clinicaId);
      return res.json({ success: true, data, count: data.length });
    } catch (error) {
      console.error('Error al listar dominios de clínica:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async crear(req, res) {
    try {
      const clinicaId = resolveClinicaId(req, req.body?.clinica_id);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const payload = {
        dominio: req.body.dominio,
        es_principal: Boolean(req.body.es_principal),
        verificado: Boolean(req.body.verificado),
        token_verificacion: req.body.token_verificacion,
        verificado_at: req.body.verificado_at || null
      };

      if (payload.es_principal) {
        await ClinicaDominiosModel.desmarcarPrincipales(clinicaId);
      }

      const created = await ClinicaDominiosModel.crear({ clinicaId, payload });
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: 'Ese dominio ya está registrado' });
      }

      console.error('Error al crear dominio de clínica:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async actualizar(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const current = await ClinicaDominiosModel.obtenerPorId(req.params.id);
      if (!current || current.clinica_id !== clinicaId) {
        return res.status(404).json({ success: false, error: 'Dominio no encontrado' });
      }

      const payload = {
        dominio: req.body.dominio,
        es_principal: req.body.es_principal,
        verificado: req.body.verificado,
        token_verificacion: req.body.token_verificacion,
        verificado_at: req.body.verificado_at
      };

      if (payload.es_principal === true) {
        await ClinicaDominiosModel.desmarcarPrincipales(clinicaId);
      }

      const updated = await ClinicaDominiosModel.actualizar({ id: req.params.id, payload });
      if (!updated) return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });

      return res.json({ success: true, data: updated });
    } catch (error) {
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: 'Ese dominio ya está registrado' });
      }

      console.error('Error al actualizar dominio de clínica:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async eliminar(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) return res.status(400).json({ success: false, error: 'clinica_id requerido' });

      const current = await ClinicaDominiosModel.obtenerPorId(req.params.id);
      if (!current || current.clinica_id !== clinicaId) {
        return res.status(404).json({ success: false, error: 'Dominio no encontrado' });
      }

      const removed = await ClinicaDominiosModel.eliminar(req.params.id);
      return res.json({ success: true, data: removed, message: 'Dominio eliminado' });
    } catch (error) {
      console.error('Error al eliminar dominio de clínica:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = ClinicaDominiosController;
