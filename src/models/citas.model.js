const db = require('../config/db');

class CitasModel {
  static async listar({ clinicaId, from = null, to = null, estado = null, profesionalId = null, pacienteId = null, limit = 100, offset = 0 }) {
    const params = [clinicaId];
    let where = 'WHERE c.clinica_id = $1';

    if (from) {
      params.push(from);
      where += ` AND c.fecha_inicio >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      where += ` AND c.fecha_fin <= $${params.length}`;
    }
    if (estado) {
      params.push(estado);
      where += ` AND c.estado = $${params.length}`;
    }
    if (profesionalId) {
      params.push(profesionalId);
      where += ` AND c.profesional_id = $${params.length}`;
    }
    if (pacienteId) {
      params.push(pacienteId);
      where += ` AND c.paciente_id = $${params.length}`;
    }

    params.push(limit);
    const limitPos = params.length;
    params.push(offset);
    const offsetPos = params.length;

    const response = await db.query(
      `SELECT
         c.*,
         p.codigo_paciente,
         per.nombres,
         per.apellido_paterno,
         per.apellido_materno,
         u.email AS profesional_email,
         esp.nombre AS especialidad_nombre
       FROM citas c
       JOIN pacientes p ON p.id = c.paciente_id
       JOIN personas per ON per.id = p.persona_id
       JOIN usuarios u ON u.id = c.profesional_id
       LEFT JOIN especialidades esp ON esp.id = c.especialidad_id
       ${where}
       ORDER BY c.fecha_inicio DESC
       LIMIT $${limitPos}
       OFFSET $${offsetPos}`,
      params
    );

    return response.rows;
  }

  static async obtenerPorId({ id, clinicaId }) {
    const response = await db.query(
      `SELECT *
       FROM citas
       WHERE id = $1 AND clinica_id = $2
       LIMIT 1`,
      [id, clinicaId]
    );

    return response.rows[0] || null;
  }

  static async crear({ clinicaId, payload, actorUserId }) {
    const response = await db.query(
      `INSERT INTO citas (
         clinica_id,
         paciente_id,
         profesional_id,
         especialidad_id,
         estado,
         canal,
         fecha_inicio,
         fecha_fin,
         motivo,
         observaciones,
         sala_consultorio,
         origen,
         created_by
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        clinicaId,
        payload.paciente_id,
        payload.profesional_id,
        payload.especialidad_id || null,
        payload.estado || 'PROGRAMADA',
        payload.canal || 'PRESENCIAL',
        payload.fecha_inicio,
        payload.fecha_fin,
        payload.motivo || null,
        payload.observaciones || null,
        payload.sala_consultorio || null,
        payload.origen || null,
        actorUserId || null
      ]
    );

    return response.rows[0];
  }

  static async actualizar({ id, clinicaId, payload }) {
    const fields = {
      paciente_id: payload.paciente_id,
      profesional_id: payload.profesional_id,
      especialidad_id: payload.especialidad_id,
      estado: payload.estado,
      canal: payload.canal,
      fecha_inicio: payload.fecha_inicio,
      fecha_fin: payload.fecha_fin,
      motivo: payload.motivo,
      observaciones: payload.observaciones,
      sala_consultorio: payload.sala_consultorio,
      origen: payload.origen,
      confirmada_at: payload.confirmada_at,
      cancelada_at: payload.cancelada_at,
      cancelada_por: payload.cancelada_por,
      cancelacion_motivo: payload.cancelacion_motivo
    };

    const entries = Object.entries(fields).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) return null;

    const setClause = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = entries.map(([_, v]) => v);
    values.push(id);
    values.push(clinicaId);

    const response = await db.query(
      `UPDATE citas
       SET ${setClause}, updated_at = NOW()
       WHERE id = $${values.length - 1}
         AND clinica_id = $${values.length}
       RETURNING *`,
      values
    );

    return response.rows[0] || null;
  }
}

module.exports = CitasModel;
