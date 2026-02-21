const PersonasModel = require('../models/personas.model');
const { obtenerPersonaPorDni } = require('../utils/perudevs');

class PersonasController {
  static async obtenerTodas(req, res) {
    try {
      const personas = await PersonasModel.obtenerTodas();
      res.json({ success: true, data: personas, count: personas.length });
    } catch (error) {
      console.error('Error al obtener personas:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async obtenerPorId(req, res) {
    try {
      const { id } = req.params;
      const persona = await PersonasModel.obtenerPorId(id);

      if (!persona) {
        return res.status(404).json({ success: false, error: 'Persona no encontrada' });
      }

      res.json({ success: true, data: persona });
    } catch (error) {
      console.error('Error al obtener persona:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async obtenerPorDni(req, res) {
    try {
      const { dni } = req.params;

      if (!dni || dni.trim() === '') {
        return res.status(400).json({ success: false, error: 'DNI requerido' });
      }

      let persona = await PersonasModel.obtenerPorDni(dni);
      if (persona) {
        return res.json({ success: true, data: persona, fuente: 'BD' });
      }

      const datosAPI = await obtenerPersonaPorDni(dni);
      if (!datosAPI) {
        return res.status(404).json({ success: false, error: 'DNI no encontrado en BD ni en API' });
      }

      persona = await PersonasModel.crear(datosAPI);
      return res.json({ success: true, data: persona, fuente: 'API' });
    } catch (error) {
      console.error('Error al buscar por DNI:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async crear(req, res) {
    try {
      const { dni, nombres, apellido_paterno, apellido_materno, sexo, fecha_nacimiento } = req.body;

      if (!dni || !nombres || !apellido_paterno || !apellido_materno || !sexo || !fecha_nacimiento) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos: dni, nombres, apellido_paterno, apellido_materno, sexo, fecha_nacimiento'
        });
      }

      const existe = await PersonasModel.existeDni(dni);
      if (existe) {
        return res.status(409).json({ success: false, error: 'El DNI ya existe en la base de datos' });
      }

      const persona = await PersonasModel.crear(req.body);
      res.status(201).json({ success: true, data: persona });
    } catch (error) {
      console.error('Error al crear persona:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async actualizar(req, res) {
    try {
      const { id } = req.params;
      const persona = await PersonasModel.obtenerPorId(id);

      if (!persona) {
        return res.status(404).json({ success: false, error: 'Persona no encontrada' });
      }

      const tieneAlgunCampo = Object.values(req.body).some(value => value !== undefined);
      if (!tieneAlgunCampo) {
        return res.status(400).json({ success: false, error: 'Debe proporcionar al menos un campo para actualizar' });
      }

      const personaActualizada = await PersonasModel.actualizar(id, req.body);
      res.json({ success: true, data: personaActualizada });
    } catch (error) {
      console.error('Error al actualizar persona:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async eliminar(req, res) {
    try {
      const { id } = req.params;
      const persona = await PersonasModel.obtenerPorId(id);

      if (!persona) {
        return res.status(404).json({ success: false, error: 'Persona no encontrada' });
      }

      // Usar soft delete para cumplimiento legal
      await PersonasModel.softDelete(id, req.user?.id);
      
      // Devolver la persona actualizada (con deleted_at)
      const personaActualizada = await PersonasModel.obtenerPorIdIncluyendoEliminadas(id);
      res.json({ success: true, data: personaActualizada, message: 'Persona eliminada correctamente' });
    } catch (error) {
      console.error('Error al eliminar persona:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async reactivar(req, res) {
    try {
      const { id } = req.params;
      const persona = await PersonasModel.obtenerPorIdIncluyendoEliminadas(id);

      if (!persona) {
        return res.status(404).json({ success: false, error: 'Persona no encontrada' });
      }

      if (!persona.deleted_at) {
        return res.status(400).json({ success: false, error: 'La persona ya está activa' });
      }

      const personaReactivada = await PersonasModel.reactivar(id);
      return res.json({ success: true, data: personaReactivada });
    } catch (error) {
      console.error('Error al reactivar persona:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = PersonasController;
