const db = require('../config/db');

class UsuarioEspecialidadesModel {
  static async listarPorUsuario({ usuarioId }) {
    const response = await db.query(
      `SELECT id, usuario_id, especialidad, anios_experiencia, numero_registro,
              organo_colegiador, activo, created_at, updated_at
       FROM usuario_especialidades
       WHERE usuario_id::text = $1
       ORDER BY especialidad ASC`,
      [usuarioId]
    );
    return response.rows;
  }

  static async obtenerPorId({ usuarioId, especialidadId }) {
    const response = await db.query(
      `SELECT id, usuario_id, especialidad, anios_experiencia, numero_registro,
              organo_colegiador, activo, created_at, updated_at
       FROM usuario_especialidades
       WHERE id::text = $1 AND usuario_id::text = $2`,
      [especialidadId, usuarioId]
    );
    return response.rows[0] || null;
  }

  static async crear({ usuarioId, payload }) {
    const { especialidad, anios_experiencia = 0, numero_registro, organo_colegiador } = payload;

    const response = await db.query(
      `INSERT INTO usuario_especialidades 
       (usuario_id, especialidad, anios_experiencia, numero_registro, organo_colegiador, activo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, usuario_id, especialidad, anios_experiencia, numero_registro,
                 organo_colegiador, activo, created_at, updated_at`,
      [usuarioId, especialidad, anios_experiencia, numero_registro, organo_colegiador, true]
    );
    return response.rows[0];
  }

  static async actualizar({ usuarioId, especialidadId, payload }) {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (payload.anios_experiencia !== undefined) {
      updates.push(`anios_experiencia = $${paramIndex++}`);
      params.push(payload.anios_experiencia);
    }
    if (payload.numero_registro !== undefined) {
      updates.push(`numero_registro = $${paramIndex++}`);
      params.push(payload.numero_registro);
    }
    if (payload.organo_colegiador !== undefined) {
      updates.push(`organo_colegiador = $${paramIndex++}`);
      params.push(payload.organo_colegiador);
    }
    if (payload.activo !== undefined) {
      updates.push(`activo = $${paramIndex++}`);
      params.push(payload.activo);
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = NOW()`);
    params.push(especialidadId);
    params.push(usuarioId);

    const response = await db.query(
      `UPDATE usuario_especialidades
       SET ${updates.join(', ')}
       WHERE id::text = $${paramIndex++} AND usuario_id::text = $${paramIndex}
       RETURNING id, usuario_id, especialidad, anios_experiencia, numero_registro,
                 organo_colegiador, activo, created_at, updated_at`,
      params
    );
    return response.rows[0] || null;
  }

  static async eliminar({ usuarioId, especialidadId }) {
    const response = await db.query(
      `DELETE FROM usuario_especialidades
       WHERE id::text = $1 AND usuario_id::text = $2
       RETURNING id`,
      [especialidadId, usuarioId]
    );
    return response.rows[0] || null;
  }

  static async listarEspecialistas({ especialidad, clinicaId = null }) {
    let query = `
      SELECT DISTINCT u.id, u.nombre, u.email, ue.especialidad
      FROM usuario_especialidades ue
      JOIN usuarios u ON ue.usuario_id = u.id
      WHERE ue.especialidad = $1 AND ue.activo = true AND u.estado = 'ACTIVO'
    `;
    const params = [especialidad];

    if (clinicaId) {
      query += ` AND u.clinica_id::text = $${params.length + 1}`;
      params.push(clinicaId);
    }

    const response = await db.query(query, params);
    return response.rows;
  }
}

module.exports = UsuarioEspecialidadesModel;
