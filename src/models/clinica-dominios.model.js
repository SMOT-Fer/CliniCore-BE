const db = require('../config/db');

class ClinicaDominiosModel {
  static async listarPorClinica(clinicaId) {
    const response = await db.query(
      `SELECT *
       FROM clinica_dominios
       WHERE clinica_id = $1
       ORDER BY es_principal DESC, created_at DESC`,
      [clinicaId]
    );

    return response.rows;
  }

  static async obtenerPorId(id) {
    const response = await db.query(
      `SELECT *
       FROM clinica_dominios
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    return response.rows[0] || null;
  }

  static async crear({ clinicaId, payload }) {
    const response = await db.query(
      `INSERT INTO clinica_dominios (
         clinica_id,
         dominio,
         es_principal,
         verificado,
         token_verificacion,
         verificado_at
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        clinicaId,
        payload.dominio,
        Boolean(payload.es_principal),
        Boolean(payload.verificado),
        payload.token_verificacion || null,
        payload.verificado_at || null
      ]
    );

    return response.rows[0];
  }

  static async actualizar({ id, payload }) {
    const fields = {
      dominio: payload.dominio,
      es_principal: payload.es_principal,
      verificado: payload.verificado,
      token_verificacion: payload.token_verificacion,
      verificado_at: payload.verificado_at
    };

    const entries = Object.entries(fields).filter(([_, value]) => value !== undefined);
    if (entries.length === 0) return null;

    const setClause = entries.map(([key], idx) => `${key} = $${idx + 1}`).join(', ');
    const values = entries.map(([_, value]) => value);
    values.push(id);

    const response = await db.query(
      `UPDATE clinica_dominios
       SET ${setClause}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return response.rows[0] || null;
  }

  static async eliminar(id) {
    const response = await db.query(
      `DELETE FROM clinica_dominios
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return response.rows[0] || null;
  }

  static async desmarcarPrincipales(clinicaId) {
    await db.query(
      `UPDATE clinica_dominios
       SET es_principal = false, updated_at = NOW()
       WHERE clinica_id = $1
         AND es_principal = true`,
      [clinicaId]
    );
  }
}

module.exports = ClinicaDominiosModel;
