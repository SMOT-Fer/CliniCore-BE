const db = require('../config/db');

class RecetasMedicasModel {
  static async listarPorClinica({ clinicaId, filter = {} }) {
    let query = `
      SELECT rc.id, rc.clinica_id, rc.paciente_id, rc.doctor_id, rc.estado, 
             rc.fecha_emision, rc.fecha_vencimiento, rc.numero_receta, rc.created_at, rc.updated_at
      FROM recetas_medicas rc
      WHERE rc.clinica_id = $1
    `;
    const params = [clinicaId];

    if (filter.paciente_id) {
      query += ` AND rc.paciente_id::text = $${params.length + 1}`;
      params.push(filter.paciente_id);
    }

    if (filter.doctor_id) {
      query += ` AND rc.doctor_id::text = $${params.length + 1}`;
      params.push(filter.doctor_id);
    }

    if (filter.estado) {
      query += ` AND rc.estado = $${params.length + 1}`;
      params.push(filter.estado);
    }

    query += ` ORDER BY rc.fecha_emision DESC`;

    const response = await db.query(query, params);
    return response.rows;
  }

  static async obtenerPorId({ clinicaId, recetaId }) {
    const response = await db.query(
      `SELECT id, clinica_id, paciente_id, doctor_id, estado,
              fecha_emision, fecha_vencimiento, numero_receta,
              instrucciones, notas, created_at, updated_at
       FROM recetas_medicas
       WHERE id::text = $1 AND clinica_id = $2`,
      [recetaId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async crear({ clinicaId, payload }) {
    const {
      paciente_id,
      doctor_id,
      numero_receta,
      instrucciones = '',
      notas = '',
    } = payload;

    const fechaEmision = new Date();
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 90); // 90 días de validez

    const response = await db.query(
      `INSERT INTO recetas_medicas 
       (clinica_id, paciente_id, doctor_id, numero_receta, estado, 
        fecha_emision, fecha_vencimiento, instrucciones, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, clinica_id, paciente_id, doctor_id, numero_receta, estado,
                 fecha_emision, fecha_vencimiento, instrucciones, notas, created_at, updated_at`,
      [clinicaId, paciente_id, doctor_id, numero_receta, 'ACTIVA',
       fechaEmision, fechaVencimiento, instrucciones, notas]
    );
    return response.rows[0];
  }

  static async actualizar({ clinicaId, recetaId, payload }) {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (payload.estado !== undefined) {
      updates.push(`estado = $${paramIndex++}`);
      params.push(payload.estado);
    }
    if (payload.instrucciones !== undefined) {
      updates.push(`instrucciones = $${paramIndex++}`);
      params.push(payload.instrucciones);
    }
    if (payload.notas !== undefined) {
      updates.push(`notas = $${paramIndex++}`);
      params.push(payload.notas);
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = NOW()`);
    params.push(recetaId);
    params.push(clinicaId);

    const response = await db.query(
      `UPDATE recetas_medicas
       SET ${updates.join(', ')}
       WHERE id::text = $${paramIndex++} AND clinica_id = $${paramIndex}
       RETURNING id, clinica_id, paciente_id, doctor_id, numero_receta, estado,
                 fecha_emision, fecha_vencimiento, instrucciones, notas, created_at, updated_at`,
      params
    );
    return response.rows[0] || null;
  }

  static async anular({ clinicaId, recetaId }) {
    return this.actualizar({
      clinicaId,
      recetaId,
      payload: { estado: 'ANULADA' },
    });
  }

  static async eliminar({ clinicaId, recetaId }) {
    const response = await db.query(
      `DELETE FROM recetas_medicas
       WHERE id::text = $1 AND clinica_id = $2
       RETURNING id`,
      [recetaId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async listarVigentes({ clinicaId }) {
    const response = await db.query(
      `SELECT id, clinica_id, paciente_id, doctor_id, numero_receta, estado,
              fecha_emision, fecha_vencimiento
       FROM recetas_medicas
       WHERE clinica_id = $1 AND estado = 'ACTIVA' AND fecha_vencimiento > NOW()
       ORDER BY fecha_vencimiento ASC`,
      [clinicaId]
    );
    return response.rows;
  }

  static async listarExpirando({ clinicaId, diasAnticipacion = 7 }) {
    const response = await db.query(
      `SELECT id, clinica_id, paciente_id, doctor_id, numero_receta,
              fecha_vencimiento
       FROM recetas_medicas
       WHERE clinica_id = $1 AND estado = 'ACTIVA'
             AND fecha_vencimiento <= NOW() + INTERVAL '${diasAnticipacion} days'
             AND fecha_vencimiento > NOW()
       ORDER BY fecha_vencimiento ASC`,
      [clinicaId]
    );
    return response.rows;
  }
}

module.exports = RecetasMedicasModel;
