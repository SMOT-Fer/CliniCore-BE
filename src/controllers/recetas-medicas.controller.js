const RecetasMedicasModel = require('../models/recetas-medicas.model');

const mapRecetasError = (error) => {
  if (error?.code === '23505') return { status: 409, message: 'Ese número de receta ya existe' };
  if (error?.code === '23503') return { status: 409, message: 'Clínica, paciente o doctor no existe' };
  if (error?.code === '22P02') return { status: 400, message: 'ID de receta inválido' };
  return { status: 500, message: 'Error interno del servidor' };
};

class RecetasMedicasController {
  static async listar(req, res) {
    try {
      const { clinicaId } = req.body;
      const filter = req.query;

      const recetas = await RecetasMedicasModel.listarPorClinica({ clinicaId, filter });

      return res.status(200).json({
        success: true,
        data: recetas,
      });
    } catch (error) {
      console.error('Error listing recetas:', error);
      const { status, message } = mapRecetasError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async obtener(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const receta = await RecetasMedicasModel.obtenerPorId({ clinicaId, recetaId: id });

      if (!receta) {
        return res.status(404).json({ success: false, error: 'Receta no encontrada' });
      }

      return res.status(200).json({
        success: true,
        data: receta,
      });
    } catch (error) {
      console.error('Error fetching receta:', error);
      const { status, message } = mapRecetasError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async crear(req, res) {
    try {
      const { clinicaId } = req.body;
      const payload = req.body.payload;

      const receta = await RecetasMedicasModel.crear({ clinicaId, payload });

      return res.status(201).json({
        success: true,
        data: receta,
      });
    } catch (error) {
      console.error('Error creating receta:', error);
      const { status, message } = mapRecetasError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async actualizar(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;
      const payload = req.body.payload;

      const receta = await RecetasMedicasModel.actualizar({ clinicaId, recetaId: id, payload });

      if (!receta) {
        return res.status(404).json({ success: false, error: 'Receta no encontrada' });
      }

      return res.status(200).json({
        success: true,
        data: receta,
      });
    } catch (error) {
      console.error('Error updating receta:', error);
      const { status, message } = mapRecetasError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async anular(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const receta = await RecetasMedicasModel.anular({ clinicaId, recetaId: id });

      if (!receta) {
        return res.status(404).json({ success: false, error: 'Receta no encontrada' });
      }

      return res.status(200).json({
        success: true,
        message: 'Receta anulada correctamente',
        data: receta,
      });
    } catch (error) {
      console.error('Error annulling receta:', error);
      const { status, message } = mapRecetasError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async eliminar(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const deleted = await RecetasMedicasModel.eliminar({ clinicaId, recetaId: id });

      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Receta no encontrada' });
      }

      return res.status(200).json({
        success: true,
        message: 'Receta eliminada correctamente',
      });
    } catch (error) {
      console.error('Error deleting receta:', error);
      const { status, message } = mapRecetasError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async listarVigentes(req, res) {
    try {
      const { clinicaId } = req.body;

      const recetas = await RecetasMedicasModel.listarVigentes({ clinicaId });

      return res.status(200).json({
        success: true,
        data: recetas,
      });
    } catch (error) {
      console.error('Error listing vigentes:', error);
      const { status, message } = mapRecetasError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async listarExpirando(req, res) {
    try {
      const { clinicaId } = req.body;
      const { dias = 7 } = req.query;

      const recetas = await RecetasMedicasModel.listarExpirando({ clinicaId, diasAnticipacion: parseInt(dias, 10) });

      return res.status(200).json({
        success: true,
        data: recetas,
      });
    } catch (error) {
      console.error('Error listing expiring:', error);
      const { status, message } = mapRecetasError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }
}

module.exports = RecetasMedicasController;
