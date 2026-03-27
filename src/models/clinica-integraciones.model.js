const db = require('../config/db');

class ClinicaIntegracionesModel {
  static async listarPorClinica({ clinicaId, filter = {} }) {
    let query = `
      SELECT id, clinica_id, provider, estado, ultimo_sync, ultimo_error, created_at, updated_at
      FROM clinica_integraciones
      WHERE clinica_id = $1
    `;
    const params = [clinicaId];

    if (filter.estado) {
      query += ` AND estado = $${params.length + 1}`;
      params.push(filter.estado);
    }

    if (filter.provider) {
      query += ` AND provider = $${params.length + 1}`;
      params.push(filter.provider);
    }

    query += ` ORDER BY created_at DESC`;

    const response = await db.query(query, params);
    return response.rows;
  }

  static async obtenerPorId({ clinicaId, integracionId }) {
    const response = await db.query(
      `SELECT id, clinica_id, provider, estado, ultimo_sync, ultimo_error, created_at, updated_at
       FROM clinica_integraciones
       WHERE id::text = $1 AND clinica_id = $2`,
      [integracionId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async crear({ clinicaId, payload }) {
    const { provider, configuration, estado = 'ACTIVE' } = payload;

    const response = await db.query(
      `INSERT INTO clinica_integraciones (clinica_id, provider, configuration, estado, ultimo_sync)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, clinica_id, provider, configuration, estado, ultimo_sync, ultimo_error, created_at, updated_at`,
      [clinicaId, provider, JSON.stringify(configuration), estado]
    );
    return response.rows[0];
  }

  static async actualizar({ clinicaId, integracionId, payload }) {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (payload.configuration !== undefined) {
      updates.push(`configuration = $${paramIndex++}`);
      params.push(JSON.stringify(payload.configuration));
    }
    if (payload.estado !== undefined) {
      updates.push(`estado = $${paramIndex++}`);
      params.push(payload.estado);
    }
    if (payload.ultimo_error !== undefined) {
      updates.push(`ultimo_error = $${paramIndex++}`);
      params.push(payload.ultimo_error);
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = NOW()`);
    params.push(integracionId);
    params.push(clinicaId);

    const response = await db.query(
      `UPDATE clinica_integraciones
       SET ${updates.join(', ')}
       WHERE id::text = $${paramIndex++} AND clinica_id = $${paramIndex}
       RETURNING id, clinica_id, provider, configuration, estado, ultimo_sync, ultimo_error, created_at, updated_at`,
      params
    );
    return response.rows[0] || null;
  }

  static async eliminar({ clinicaId, integracionId }) {
    const response = await db.query(
      `DELETE FROM clinica_integraciones
       WHERE id::text = $1 AND clinica_id = $2
       RETURNING id`,
      [integracionId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async contarIntegracionesActivas({ clinicaId }) {
    const response = await db.query(
      `SELECT COUNT(*) as total FROM clinica_integraciones
       WHERE clinica_id = $1 AND estado = 'ACTIVE'`,
      [clinicaId]
    );
    return parseInt(response.rows[0].total, 10);
  }

  static async obtenerPorProvider({ clinicaId, provider }) {
    const response = await db.query(
      `SELECT id, clinica_id, provider, estado, configuration, ultimo_sync, ultimo_error, created_at, updated_at
       FROM clinica_integraciones
       WHERE clinica_id = $1 AND provider = $2 AND estado = 'ACTIVE'
       LIMIT 1`,
      [clinicaId, provider]
    );
    return response.rows[0] || null;
  }

  static async marcarError({ integracionId, clinicaId, errorMsg }) {
    await db.query(
      `UPDATE clinica_integraciones
       SET estado = 'ERROR', ultimo_error = $1, updated_at = NOW()
       WHERE id::text = $2 AND clinica_id = $3`,
      [errorMsg, integracionId, clinicaId]
    );
  }
}

module.exports = ClinicaIntegracionesModel;
