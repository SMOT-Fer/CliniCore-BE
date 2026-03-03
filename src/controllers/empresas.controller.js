const EmpresasModel = require('../models/empresas.model');
const SuscripcionesModel = require('../models/suscripciones.model');

class EmpresasController {
  static async obtenerActivasPublicas(req, res) {
    try {
      const empresas = await EmpresasModel.obtenerActivasPublicas();
      res.json({ success: true, data: empresas, count: empresas.length });
    } catch (error) {
      console.error('Error al obtener empresas activas públicas:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async obtenerTodas(req, res) {
    try {
      const empresas = await EmpresasModel.obtenerTodas();
      const empresaIdUsuario = req.user?.empresa_id ?? req.user?.clinica_id;

      if (req.user?.rol === 'ADMIN') {
        const propias = empresas.filter(c => c.id === empresaIdUsuario && c.deleted_at === null);
        return res.json({ success: true, data: propias, count: propias.length });
      }

      res.json({ success: true, data: empresas, count: empresas.length });
    } catch (error) {
      console.error('Error al obtener empresas:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async obtenerPorId(req, res) {
    try {
      const { id } = req.params;
      const empresa = await EmpresasModel.obtenerPorId(id);

      if (!empresa) {
        return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
      }

      const empresaIdUsuario = req.user?.empresa_id ?? req.user?.clinica_id;
      if (req.user?.rol === 'ADMIN' && empresa.id !== empresaIdUsuario) {
        return res.status(403).json({ success: false, error: 'No autorizado para esta empresa' });
      }

      res.json({ success: true, data: empresa });
    } catch (error) {
      console.error('Error al obtener empresa:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async crear(req, res) {
    try {
      const { nombre, ruc, tipo_negocio_id } = req.body;

      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ success: false, error: 'Nombre de empresa requerido' });
      }

      if (!tipo_negocio_id) {
        return res.status(400).json({ success: false, error: 'tipo_negocio_id es requerido' });
      }

      if (ruc) {
        const existe = await EmpresasModel.existeRuc(ruc);
        if (existe) {
          return res.status(409).json({ success: false, error: 'El RUC ya existe en la base de datos' });
        }
      }

      const empresa = await EmpresasModel.crear(req.body);

      await SuscripcionesModel.crearSuscripcionTrialInicial(empresa.id, req.user?.id || null);

      res.status(201).json({ success: true, data: empresa });
    } catch (error) {
      console.error('Error al crear empresa:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async actualizar(req, res) {
    try {
      const { id } = req.params;
      const empresaActual = await EmpresasModel.obtenerPorIdIncluyendoEliminadas(id);

      if (!empresaActual) {
        return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
      }

      const tieneAlgunCampo = Object.values(req.body).some(value => value !== undefined);
      if (!tieneAlgunCampo) {
        return res.status(400).json({ success: false, error: 'Debe proporcionar al menos un campo para actualizar' });
      }

      if (req.user?.rol === 'ADMIN') {
        const empresaIdUsuario = req.user?.empresa_id ?? req.user?.clinica_id;
        if (empresaActual.id !== empresaIdUsuario) {
          return res.status(403).json({ success: false, error: 'ADMIN solo puede editar su propia empresa' });
        }
      }

      if (req.body.ruc && req.body.ruc !== empresaActual.ruc) {
        const existe = await EmpresasModel.existeRuc(req.body.ruc);
        if (existe) {
          return res.status(409).json({ success: false, error: 'El RUC ya existe en la base de datos' });
        }
      }

      const empresa = await EmpresasModel.actualizar(id, req.body);
      res.json({ success: true, data: empresa });
    } catch (error) {
      console.error('Error al actualizar empresa:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async eliminar(req, res) {
    try {
      const { id } = req.params;
      const empresa = await EmpresasModel.obtenerPorIdIncluyendoEliminadas(id);

      if (!empresa) {
        return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
      }

      const empresaDesactivada = await EmpresasModel.softDelete(id, req.user?.id);
      res.json({ success: true, data: empresaDesactivada, message: 'Empresa desactivada correctamente' });
    } catch (error) {
      console.error('Error al eliminar empresa:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async desactivar(req, res) {
    try {
      const { id } = req.params;
      const empresa = await EmpresasModel.obtenerPorIdIncluyendoEliminadas(id);

      if (!empresa) {
        return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
      }

      if (empresa.deleted_at) {
        return res.status(400).json({ success: false, error: 'La empresa ya está desactivada' });
      }

      const empresaDesactivada = await EmpresasModel.softDelete(id, req.user?.id);
      return res.json({ success: true, data: empresaDesactivada, message: 'Empresa desactivada correctamente' });
    } catch (error) {
      console.error('Error al desactivar empresa:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async reactivar(req, res) {
    try {
      const { id } = req.params;
      const empresa = await EmpresasModel.obtenerPorIdIncluyendoEliminadas(id);

      if (!empresa) {
        return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
      }

      const empresaReactivada = await EmpresasModel.reactivar(id);
      return res.json({ success: true, data: empresaReactivada, message: 'Empresa reactivada correctamente' });
    } catch (error) {
      console.error('Error al reactivar empresa:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = EmpresasController;
