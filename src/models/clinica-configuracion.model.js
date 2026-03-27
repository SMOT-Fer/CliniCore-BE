const db = require('../config/db');

class ClinicaConfiguracionModel {
  static async obtenerPorClinicaId(clinicaId) {
    const response = await db.query(
      `SELECT *
       FROM clinica_configuracion
       WHERE clinica_id = $1
       LIMIT 1`,
      [clinicaId]
    );

    return response.rows[0] || null;
  }

  static async upsert({ clinicaId, payload }) {
    const response = await db.query(
      `INSERT INTO clinica_configuracion (
         clinica_id,
         timezone,
         locale,
         moneda,
         logo_url,
         color_primario,
         config
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (clinica_id)
       DO UPDATE SET
         timezone = EXCLUDED.timezone,
         locale = EXCLUDED.locale,
         moneda = EXCLUDED.moneda,
         logo_url = EXCLUDED.logo_url,
         color_primario = EXCLUDED.color_primario,
         config = EXCLUDED.config,
         updated_at = NOW()
       RETURNING *`,
      [
        clinicaId,
        payload.timezone || 'America/Lima',
        payload.locale || 'es-PE',
        payload.moneda || 'PEN',
        payload.logo_url || null,
        payload.color_primario || null,
        payload.config || {}
      ]
    );

    return response.rows[0];
  }
}

module.exports = ClinicaConfiguracionModel;
