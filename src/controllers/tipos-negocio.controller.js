const TiposNegocioModel = require('../models/tipos-negocio.model');

function mapTiposNegocioError(error) {
  const msg = String(error?.message || '').toLowerCase();

  // Si la BD aun tiene tipos_negocio como VIEW legacy, inserciones/updates/deletes fallan.
  if (msg.includes('cannot insert into view') || msg.includes('cannot update view') || msg.includes('cannot delete from view')) {
    return 'Catálogo en modo solo lectura. Ejecuta la migración 010_enable_tipos_negocio_crud.sql';
  }

  if (error?.code === '22P02') {
    return 'ID de tipo de negocio inválido';
  }

  if (error?.code === '23505') {
    return 'Ya existe un tipo de negocio con ese código';
  }

  return null;
}

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
      const editable = await TiposNegocioModel.esCatalogoEditable();
      if (!editable) {
        return res.status(409).json({
          success: false,
          error: 'Catálogo en modo solo lectura. Ejecuta la migración 010_enable_tipos_negocio_crud.sql'
        });
      }

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
      const mapped = mapTiposNegocioError(error);
      if (mapped) return res.status(409).json({ success: false, error: mapped });
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async actualizar(req, res) {
    try {
      const editable = await TiposNegocioModel.esCatalogoEditable();
      if (!editable) {
        return res.status(409).json({
          success: false,
          error: 'Catálogo en modo solo lectura. Ejecuta la migración 010_enable_tipos_negocio_crud.sql'
        });
      }

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
      const mapped = mapTiposNegocioError(error);
      if (mapped) return res.status(409).json({ success: false, error: mapped });
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async eliminar(req, res) {
    try {
      const editable = await TiposNegocioModel.esCatalogoEditable();
      if (!editable) {
        return res.status(409).json({
          success: false,
          error: 'Catálogo en modo solo lectura. Ejecuta la migración 010_enable_tipos_negocio_crud.sql'
        });
      }

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
      const mapped = mapTiposNegocioError(error);
      if (mapped) return res.status(409).json({ success: false, error: mapped });
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = TiposNegocioController;
