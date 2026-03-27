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
      const codigo = req.body.codigo.trim().toUpperCase();
      const nombre = req.body.nombre.trim();

      const existeCodigo = await TiposNegocioModel.obtenerPorCodigo(codigo);
      if (existeCodigo) {
        return res.status(409).json({ success: false, error: 'Ya existe un tipo de negocio con ese codigo' });
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
      const actual = await TiposNegocioModel.obtenerPorId(id);
      if (!actual) {
        return res.status(404).json({ success: false, error: 'Tipo de negocio no encontrado' });
      }

      const payload = {};
      if (typeof req.body.codigo === 'string') payload.codigo = req.body.codigo.trim().toUpperCase();
      if (typeof req.body.nombre === 'string') payload.nombre = req.body.nombre.trim();

      if (payload.codigo && payload.codigo !== actual.codigo) {
        const existeCodigo = await TiposNegocioModel.obtenerPorCodigo(payload.codigo);
        if (existeCodigo && existeCodigo.id !== id) {
          return res.status(409).json({ success: false, error: 'Ya existe un tipo de negocio con ese codigo' });
        }
      }

      const tipo = await TiposNegocioModel.actualizar(id, payload);
      if (!tipo) {
        return res.status(400).json({ success: false, error: 'No se pudo actualizar el tipo de negocio' });
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
      const actual = await TiposNegocioModel.obtenerPorId(id);
      if (!actual) {
        return res.status(404).json({ success: false, error: 'Tipo de negocio no encontrado' });
      }

      // Evita borrar un tipo todavía referenciado por clínicas activas/inactivas.
      const totalClinicas = await TiposNegocioModel.contarClinicasPorTipo(id);
      if (totalClinicas > 0) {
        return res.status(409).json({
          success: false,
          error: `No se puede eliminar: hay ${totalClinicas} clinica(s) usando este tipo de negocio`
        });
      }

      const eliminado = await TiposNegocioModel.eliminar(id);
      if (!eliminado) {
        return res.status(400).json({ success: false, error: 'No se pudo eliminar el tipo de negocio' });
      }

      return res.json({ success: true, message: 'Tipo de negocio eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar tipo de negocio:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = TiposNegocioController;
