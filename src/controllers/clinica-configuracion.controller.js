const ClinicaConfiguracionModel = require('../models/clinica-configuracion.model');

function resolveClinicaId(req, inputClinicaId = null) {
  if (req.user?.rol === 'SUPERADMIN') return inputClinicaId || req.query?.clinica_id || null;
  return req.user?.clinica_id || req.user?.empresa_id || null;
}

class ClinicaConfiguracionController {
  static async obtener(req, res) {
    try {
      const clinicaId = resolveClinicaId(req);
      if (!clinicaId) {
        return res.status(400).json({ success: false, error: 'clinica_id requerido' });
      }

      const data = await ClinicaConfiguracionModel.obtenerPorClinicaId(clinicaId);
      if (!data) {
        return res.status(404).json({ success: false, error: 'Configuración no encontrada para la clínica' });
      }

      return res.json({ success: true, data });
    } catch (error) {
      console.error('Error al obtener configuración de clínica:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async guardar(req, res) {
    try {
      const clinicaId = resolveClinicaId(req, req.body?.clinica_id);
      if (!clinicaId) {
        return res.status(400).json({ success: false, error: 'clinica_id requerido' });
      }

      // Mantiene cualquier clave dinámica dentro del objeto config para ajustes extensibles.
      const payload = {
        timezone: req.body.timezone,
        locale: req.body.locale,
        moneda: req.body.moneda,
        logo_url: req.body.logo_url,
        color_primario: req.body.color_primario,
        config: req.body.config || {}
      };

      const saved = await ClinicaConfiguracionModel.upsert({ clinicaId, payload });
      return res.json({ success: true, data: saved });
    } catch (error) {
      console.error('Error al guardar configuración de clínica:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = ClinicaConfiguracionController;
