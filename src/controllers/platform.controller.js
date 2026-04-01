const PlanesSaasModel = require('../models/planes-saas.model');
const SuscripcionesModel = require('../models/suscripciones.model');

class PlatformController {
  static async listarPlanes(req, res) {
    try {
      const soloActivos = req.query?.soloActivos !== 'false';
      const planes = soloActivos
        ? await PlanesSaasModel.listarActivos()
        : await PlanesSaasModel.listarTodos();

      return res.json({ success: true, data: planes, count: planes.length });
    } catch (error) {
      console.error('Error al listar planes SaaS:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async crearPlan(req, res) {
    try {
      const codigo = String(req.body.codigo || '').trim().toUpperCase();
      const nombre = String(req.body.nombre || '').trim();

      if (!codigo || !nombre) {
        return res.status(400).json({ success: false, error: 'codigo y nombre son obligatorios' });
      }

      const existente = await PlanesSaasModel.obtenerPorCodigo(codigo);
      if (existente) {
        return res.status(409).json({ success: false, error: 'El código de plan ya existe' });
      }

      const plan = await PlanesSaasModel.crear({
        ...req.body,
        codigo,
        nombre
      });

      return res.status(201).json({ success: true, data: plan });
    } catch (error) {
      console.error('Error al crear plan SaaS:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async actualizarPlan(req, res) {
    try {
      const { id } = req.params;

      const payload = {
        ...req.body,
        codigo: req.body.codigo ? String(req.body.codigo).trim().toUpperCase() : undefined,
        nombre: req.body.nombre ? String(req.body.nombre).trim() : undefined
      };

      if (payload.codigo) {
        const existente = await PlanesSaasModel.obtenerPorCodigo(payload.codigo);
        if (existente && existente.id !== id) {
          return res.status(409).json({ success: false, error: 'El código de plan ya existe' });
        }
      }

      const actualizado = await PlanesSaasModel.actualizar(id, payload);
      if (!actualizado) {
        return res.status(404).json({ success: false, error: 'Plan no encontrado' });
      }

      return res.json({ success: true, data: actualizado });
    } catch (error) {
      console.error('Error al actualizar plan SaaS:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async eliminarPlan(req, res) {
    try {
      const { id } = req.params;

      const plan = await PlanesSaasModel.obtenerPorId(id);
      if (!plan) {
        return res.status(404).json({ success: false, error: 'Plan no encontrado' });
      }

      const totalSuscripciones = await PlanesSaasModel.contarSuscripcionesPorPlan(id);
      if (totalSuscripciones > 0) {
        const inactivado = await PlanesSaasModel.inactivar(id);
        return res.json({
          success: true,
          data: inactivado,
          message: 'El plan tiene historial de suscripciones y fue inactivado en lugar de eliminarse.'
        });
      }

      const eliminado = await PlanesSaasModel.eliminar(id);
      return res.json({
        success: true,
        data: eliminado,
        message: 'Plan eliminado correctamente'
      });
    } catch (error) {
      console.error('Error al eliminar plan SaaS:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async listarSuscripcionesVigentes(req, res) {
    try {
      const items = await SuscripcionesModel.listarVigentes();
      return res.json({ success: true, data: items, count: items.length });
    } catch (error) {
      console.error('Error al listar suscripciones vigentes:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async listarHistorialEmpresa(req, res) {
    try {
      const { id } = req.params;
      const historial = await SuscripcionesModel.listarHistorialPorEmpresa(id);
      return res.json({ success: true, data: historial, count: historial.length });
    } catch (error) {
      console.error('Error al listar historial de suscripciones por empresa:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async listarEventos(req, res) {
    try {
      const limit = Math.min(Number(req.query?.limit || 100), 500);
      const offset = Number(req.query?.offset || 0);
      const empresaId = req.query?.clinica_id || null;
      const suscripcionId = req.query?.suscripcion_id || null;

      const eventos = await SuscripcionesModel.listarEventos({
        empresaId,
        suscripcionId,
        limit,
        offset
      });

      return res.json({ success: true, data: eventos, count: eventos.length });
    } catch (error) {
      console.error('Error al listar eventos de suscripción:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async listarUsoMensual(req, res) {
    try {
      const limit = Math.min(Number(req.query?.limit || 100), 500);
      const offset = Number(req.query?.offset || 0);
      const empresaId = req.query?.clinica_id || null;
      const periodo = req.query?.periodo_yyyymm || null;

      const uso = await SuscripcionesModel.listarUsoMensual({
        empresaId,
        periodo,
        limit,
        offset
      });

      return res.json({ success: true, data: uso, count: uso.length });
    } catch (error) {
      console.error('Error al listar uso mensual de plan:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async asignarPlanEmpresa(req, res) {
    try {
      const { clinica_id, plan_id, estado } = req.body;

      if (!clinica_id || !plan_id) {
        return res.status(400).json({ success: false, error: 'clinica_id y plan_id son obligatorios' });
      }

      const plan = await PlanesSaasModel.obtenerPorId(plan_id);
      if (!plan) {
        return res.status(404).json({ success: false, error: 'Plan no encontrado' });
      }

      const suscripcion = await SuscripcionesModel.asignarPlanEmpresa({
        empresaId: clinica_id,
        planId: plan_id,
        estadoInicial: estado || 'ACTIVA',
        actorUserId: req.user?.id || null
      });

      return res.status(201).json({ success: true, data: suscripcion });
    } catch (error) {
      console.error('Error al asignar plan a empresa:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async miSuscripcion(req, res) {
    try {
      if (req.user?.rol === 'SUPERADMIN') {
        return res.json({
          success: true,
          data: {
            es_superadmin: true,
            suscripcion: null
          }
        });
      }

      const empresaId = req.user?.clinica_id ?? req.user?.empresa_id;
      if (!empresaId) {
        return res.status(400).json({ success: false, error: 'Usuario sin empresa asignada' });
      }

      const vigente = await SuscripcionesModel.obtenerVigentePorEmpresa(empresaId);
      const historial = await SuscripcionesModel.listarHistorialPorEmpresa(empresaId);

      return res.json({
        success: true,
        data: {
          vigente,
          historial
        }
      });
    } catch (error) {
      console.error('Error al consultar suscripción de usuario:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = PlatformController;
