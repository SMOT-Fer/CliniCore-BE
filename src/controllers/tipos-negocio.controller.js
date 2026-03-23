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
    return res.status(410).json({
      success: false,
      error: 'Operacion deshabilitada: el sistema ya no administra tipos de negocio por clinica'
    });
  }

  static async actualizar(req, res) {
    return res.status(410).json({
      success: false,
      error: 'Operacion deshabilitada: el sistema ya no administra tipos de negocio por clinica'
    });
  }

  static async eliminar(req, res) {
    return res.status(410).json({
      success: false,
      error: 'Operacion deshabilitada: el sistema ya no administra tipos de negocio por clinica'
    });
  }
}

module.exports = TiposNegocioController;
