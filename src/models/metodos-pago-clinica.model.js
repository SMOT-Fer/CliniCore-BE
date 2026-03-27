const db = require('../config/db');

class MetodosPagoClinicaModel {
  static async listarPorClinica({ clinicaId }) {
    const response = await db.query(
      `SELECT id, clinica_id, tipo_metodo, proveedor, estado, configuracion,
              fecha_activacion, created_at, updated_at
       FROM metodos_pago_clinica
       WHERE clinica_id = $1
       ORDER BY fecha_activacion DESC, tipo_metodo ASC`,
      [clinicaId]
    );
    return response.rows;
  }

  static async obtenerPorId({ clinicaId, metodoId }) {
    const response = await db.query(
      `SELECT id, clinica_id, tipo_metodo, proveedor, estado, configuracion,
              fecha_activacion, created_at, updated_at
       FROM metodos_pago_clinica
       WHERE id::text = $1 AND clinica_id = $2`,
      [metodoId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async crear({ clinicaId, payload }) {
    const { tipo_metodo, proveedor, configuracion = {} } = payload;

    const response = await db.query(
      `INSERT INTO metodos_pago_clinica 
       (clinica_id, tipo_metodo, proveedor, configuracion, estado, fecha_activacion)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, clinica_id, tipo_metodo, proveedor, estado, configuracion,
                 fecha_activacion, created_at, updated_at`,
      [clinicaId, tipo_metodo, proveedor, JSON.stringify(configuracion), 'ACTIVO']
    );
    return response.rows[0];
  }

  static async actualizar({ clinicaId, metodoId, payload }) {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (payload.estado !== undefined) {
      updates.push(`estado = $${paramIndex++}`);
      params.push(payload.estado);
    }
    if (payload.configuracion !== undefined) {
      updates.push(`configuracion = $${paramIndex++}`);
      params.push(JSON.stringify(payload.configuracion));
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = NOW()`);
    params.push(metodoId);
    params.push(clinicaId);

    const response = await db.query(
      `UPDATE metodos_pago_clinica
       SET ${updates.join(', ')}
       WHERE id::text = $${paramIndex++} AND clinica_id = $${paramIndex}
       RETURNING id, clinica_id, tipo_metodo, proveedor, estado, configuracion,
                 fecha_activacion, created_at, updated_at`,
      params
    );
    return response.rows[0] || null;
  }

  static async eliminar({ clinicaId, metodoId }) {
    const response = await db.query(
      `DELETE FROM metodos_pago_clinica
       WHERE id::text = $1 AND clinica_id = $2
       RETURNING id`,
      [metodoId, clinicaId]
    );
    return response.rows[0] || null;
  }
}

module.exports = MetodosPagoClinicaModel;
