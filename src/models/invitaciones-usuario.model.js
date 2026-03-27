const db = require('../config/db');
const crypto = require('crypto');

class InvitacionesUsuarioModel {
  static generarTokenInvitacion() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async listarPorClinica({ clinicaId, filter = {} }) {
    let query = `
      SELECT id, clinica_id, email, rol, estado, token_invitacion, 
             url_aceptacion, expira_en, creado_por, created_at, updated_at
      FROM invitaciones_usuario
      WHERE clinica_id = $1
    `;
    const params = [clinicaId];

    if (filter.estado) {
      query += ` AND estado = $${params.length + 1}`;
      params.push(filter.estado);
    }

    query += ` ORDER BY created_at DESC`;

    const response = await db.query(query, params);
    return response.rows;
  }

  static async obtenerPorId({ clinicaId, invitacionId }) {
    const response = await db.query(
      `SELECT id, clinica_id, email, rol, estado, token_invitacion,
              url_aceptacion, expira_en, creado_por, created_at, updated_at
       FROM invitaciones_usuario
       WHERE id::text = $1 AND clinica_id = $2`,
      [invitacionId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async obtenerPorToken({ token }) {
    const response = await db.query(
      `SELECT id, clinica_id, email, rol, estado, token_invitacion,
              expira_en, created_at
       FROM invitaciones_usuario
       WHERE token_invitacion = $1 AND estado = 'PENDIENTE' AND expira_en > NOW()
       LIMIT 1`,
      [token]
    );
    return response.rows[0] || null;
  }

  static async crear({ clinicaId, payload, creadoPor }) {
    const { email, rol } = payload;
    const tokenInvitacion = this.generarTokenInvitacion();
    const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const response = await db.query(
      `INSERT INTO invitaciones_usuario 
       (clinica_id, email, rol, token_invitacion, estado, expira_en, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, clinica_id, email, rol, estado, token_invitacion,
                 expira_en, creado_por, created_at, updated_at`,
      [clinicaId, email, rol, tokenInvitacion, 'PENDIENTE', expiraEn, creadoPor]
    );
    return response.rows[0];
  }

  static async aceptarInvitacion({ invitacionId, usuarioId }) {
    const response = await db.query(
      `UPDATE invitaciones_usuario
       SET estado = 'ACEPTADA', usuario_id = $1, updated_at = NOW()
       WHERE id::text = $2
       RETURNING id, clinica_id, email, rol, estado, usuario_id, updated_at`,
      [usuarioId, invitacionId]
    );
    return response.rows[0] || null;
  }

  static async rechazarInvitacion({ invitacionId }) {
    const response = await db.query(
      `UPDATE invitaciones_usuario
       SET estado = 'RECHAZADA', updated_at = NOW()
       WHERE id::text = $1
       RETURNING id, estado, updated_at`,
      [invitacionId]
    );
    return response.rows[0] || null;
  }

  static async cancelarInvitacion({ clinicaId, invitacionId }) {
    const response = await db.query(
      `UPDATE invitaciones_usuario
       SET estado = 'CANCELADA', updated_at = NOW()
       WHERE id::text = $1 AND clinica_id = $2
       RETURNING id, estado, updated_at`,
      [invitacionId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async limpiarExpiradas() {
    const response = await db.query(
      `DELETE FROM invitaciones_usuario
       WHERE estado = 'PENDIENTE' AND expira_en < NOW()
       RETURNING id`
    );
    return response.rowCount;
  }
}

module.exports = InvitacionesUsuarioModel;
