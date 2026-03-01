const TiposNegocioModel = require('../models/tipos-negocio.model');

class TiposNegocioController {
  static async listar(req, res) {
    try {
      const tipos = await TiposNegocioModel.listarTodos();
      return res.json({ success: true, data: tipos, count: tipos.length });
    } catch (error) {
      console.error('Error al listar tipos de negocio:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async obtenerPorId(req, res) {
    try {
      const { id } = req.params;
      const tipo = await TiposNegocioModel.obtenerPorId(id);

      if (!tipo) {
        return res.status(404).json({ success: false, error: 'Tipo de negocio no encontrado' });
      }

      return res.json({ success: true, data: tipo });
    } catch (error) {
      console.error('Error al obtener tipo de negocio:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async crear(req, res) {
    try {
      const codigo = String(req.body.codigo || '').trim().toUpperCase();
      const nombre = String(req.body.nombre || '').trim();

      if (!codigo || !nombre) {
        return res.status(400).json({ success: false, error: 'codigo y nombre son requeridos' });
      }

      const existente = await TiposNegocioModel.obtenerPorCodigo(codigo);
      if (existente) {
        return res.status(409).json({ success: false, error: 'El código de tipo de negocio ya existe' });
      }

      const tipo = await TiposNegocioModel.crear({ codigo, nombre });
      return res.status(201).json({ success: true, data: tipo });
    } catch (error) {
      console.error('Error al crear tipo de negocio:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async actualizar(req, res) {
    try {
      const { id } = req.params;
      const payload = {};

      if (req.body.codigo !== undefined) {
        payload.codigo = String(req.body.codigo || '').trim().toUpperCase();
      }

      if (req.body.nombre !== undefined) {
        payload.nombre = String(req.body.nombre || '').trim();
      }

      const tieneCampos = Object.values(payload).some((value) => value !== undefined);
      if (!tieneCampos) {
        return res.status(400).json({ success: false, error: 'Debe proporcionar al menos un campo para actualizar' });
      }

      if (payload.codigo) {
        const existente = await TiposNegocioModel.obtenerPorCodigo(payload.codigo);
        if (existente && existente.id !== id) {
          return res.status(409).json({ success: false, error: 'El código de tipo de negocio ya existe' });
        }
      }

      const tipo = await TiposNegocioModel.actualizar(id, payload);

      if (!tipo) {
        return res.status(404).json({ success: false, error: 'Tipo de negocio no encontrado' });
      }

      return res.json({ success: true, data: tipo });
    } catch (error) {
      console.error('Error al actualizar tipo de negocio:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async eliminar(req, res) {
    try {
      const { id } = req.params;
      const eliminado = await TiposNegocioModel.eliminar(id);

      if (!eliminado) {
        return res.status(404).json({ success: false, error: 'Tipo de negocio no encontrado' });
      }

      return res.json({ success: true, message: 'Tipo de negocio eliminado correctamente', data: eliminado });
    } catch (error) {
      if (error && error.code === '23503') {
        return res.status(409).json({ success: false, error: 'No se puede eliminar: existen empresas asociadas' });
      }
      console.error('Error al eliminar tipo de negocio:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = TiposNegocioController;
