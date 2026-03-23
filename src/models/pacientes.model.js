const db = require('../config/db');

function randomSuffix(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function generarNumeroHistoria(client, clinicaId) {
  for (let i = 0; i < 5; i += 1) {
    const codigo = `HC-${new Date().getFullYear()}-${randomSuffix(6)}`;
    const exists = await client.query(
      `SELECT 1
       FROM historias_clinicas
       WHERE clinica_id = $1 AND numero_historia = $2
       LIMIT 1`,
      [clinicaId, codigo]
    );

    if (exists.rows.length === 0) return codigo;
  }

  throw new Error('No se pudo generar numero de historia unico');
}

class PacientesModel {
  static async listarPorClinica({ clinicaId, q = null, estado = null, limit = 100, offset = 0 }) {
    const params = [clinicaId];
    let where = 'WHERE p.clinica_id = $1 AND p.deleted_at IS NULL';

    if (estado) {
      params.push(estado);
      where += ` AND p.estado = $${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      where += ` AND (
        p.codigo_paciente ILIKE $${params.length}
        OR per.dni ILIKE $${params.length}
        OR per.nombres ILIKE $${params.length}
        OR per.apellido_paterno ILIKE $${params.length}
        OR per.apellido_materno ILIKE $${params.length}
      )`;
    }

    params.push(limit);
    const limitPos = params.length;
    params.push(offset);
    const offsetPos = params.length;

    const response = await db.query(
      `SELECT
         p.*,
         per.dni,
         per.nombres,
         per.apellido_paterno,
         per.apellido_materno,
         hc.id AS historia_clinica_id,
         hc.numero_historia
       FROM pacientes p
       JOIN personas per ON per.id = p.persona_id
       LEFT JOIN historias_clinicas hc ON hc.paciente_id = p.id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${limitPos}
       OFFSET $${offsetPos}`,
      params
    );

    return response.rows;
  }

  static async obtenerPorId({ id, clinicaId }) {
    const response = await db.query(
      `SELECT
         p.*,
         per.dni,
         per.nombres,
         per.apellido_paterno,
         per.apellido_materno,
         hc.id AS historia_clinica_id,
         hc.numero_historia
       FROM pacientes p
       JOIN personas per ON per.id = p.persona_id
       LEFT JOIN historias_clinicas hc ON hc.paciente_id = p.id
       WHERE p.id = $1
         AND p.clinica_id = $2
       LIMIT 1`,
      [id, clinicaId]
    );

    return response.rows[0] || null;
  }

  static async existePersonaEnClinica({ personaId, clinicaId, excludeId = null }) {
    const params = [personaId, clinicaId];
    let where = 'WHERE persona_id = $1 AND clinica_id = $2 AND deleted_at IS NULL';

    if (excludeId) {
      params.push(excludeId);
      where += ` AND id <> $${params.length}`;
    }

    const response = await db.query(`SELECT 1 FROM pacientes ${where} LIMIT 1`, params);
    return response.rows.length > 0;
  }

  static async crearConHistoria({ clinicaId, payload, actorUserId }) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const insertedPaciente = await client.query(
        `INSERT INTO pacientes (
           clinica_id,
           persona_id,
           codigo_paciente,
           estado,
           fecha_alta,
           ocupacion,
           grupo_sanguineo,
           alergias_json,
           antecedentes_json,
           contacto_emergencia_nombre,
           contacto_emergencia_telefono,
           observaciones,
           created_by
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13)
         RETURNING *`,
        [
          clinicaId,
          payload.persona_id,
          payload.codigo_paciente || null,
          payload.estado || 'ACTIVO',
          payload.fecha_alta || new Date().toISOString().slice(0, 10),
          payload.ocupacion || null,
          payload.grupo_sanguineo || null,
          JSON.stringify(payload.alergias_json || []),
          JSON.stringify(payload.antecedentes_json || {}),
          payload.contacto_emergencia_nombre || null,
          payload.contacto_emergencia_telefono || null,
          payload.observaciones || null,
          actorUserId || null
        ]
      );

      const paciente = insertedPaciente.rows[0];
      const numeroHistoria = await generarNumeroHistoria(client, clinicaId);

      await client.query(
        `INSERT INTO historias_clinicas (
           clinica_id,
           paciente_id,
           numero_historia,
           activo
         ) VALUES ($1,$2,$3,TRUE)`,
        [clinicaId, paciente.id, numeroHistoria]
      );

      await client.query('COMMIT');
      return this.obtenerPorId({ id: paciente.id, clinicaId });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async actualizar({ id, clinicaId, payload }) {
    const fields = {
      codigo_paciente: payload.codigo_paciente,
      estado: payload.estado,
      fecha_alta: payload.fecha_alta,
      ocupacion: payload.ocupacion,
      grupo_sanguineo: payload.grupo_sanguineo,
      alergias_json: payload.alergias_json ? JSON.stringify(payload.alergias_json) : undefined,
      antecedentes_json: payload.antecedentes_json ? JSON.stringify(payload.antecedentes_json) : undefined,
      contacto_emergencia_nombre: payload.contacto_emergencia_nombre,
      contacto_emergencia_telefono: payload.contacto_emergencia_telefono,
      observaciones: payload.observaciones
    };

    const entries = Object.entries(fields).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) return null;

    const setParts = entries.map(([k], i) => `${k} = $${i + 1}`);
    const values = entries.map(([_, v]) => v);
    values.push(id);
    values.push(clinicaId);

    const response = await db.query(
      `UPDATE pacientes
       SET ${setParts.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length - 1}
         AND clinica_id = $${values.length}
       RETURNING *`,
      values
    );

    return response.rows[0] || null;
  }

  static async softDelete({ id, clinicaId, actorUserId }) {
    const response = await db.query(
      `UPDATE pacientes
       SET deleted_at = NOW(), deleted_by = $3, estado = 'INACTIVO'
       WHERE id = $1 AND clinica_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [id, clinicaId, actorUserId || null]
    );

    return response.rows[0] || null;
  }

  static async reactivar({ id, clinicaId }) {
    const response = await db.query(
      `UPDATE pacientes
       SET deleted_at = NULL, deleted_by = NULL, estado = 'ACTIVO'
       WHERE id = $1 AND clinica_id = $2
       RETURNING *`,
      [id, clinicaId]
    );

    return response.rows[0] || null;
  }
}

module.exports = PacientesModel;
