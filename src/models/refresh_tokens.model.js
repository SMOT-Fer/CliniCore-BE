const db = require('../config/db');

class RefreshTokensModel {
  static async listarActivos() {
    const response = await db.query(
      `SELECT rt.id,
              rt.usuario_id,
              rt.expires_at,
              rt.revoked_at,
              rt.created_at,
              u.email,
              u.rol,
              u.clinica_id,
              u.clinica_id AS empresa_id
       FROM refresh_tokens rt
       JOIN usuarios u ON u.id = rt.usuario_id
       WHERE rt.revoked_at IS NULL AND rt.expires_at > NOW()
       ORDER BY rt.created_at DESC`
    );

    return response.rows;
  }

  static async crear({ usuario_id, token_hash, expires_at }) {
    const response = await db.query(
      `INSERT INTO refresh_tokens (usuario_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [usuario_id, token_hash, expires_at]
    );

    return response.rows[0];
  }

  static async obtenerPorId(id) {
    const response = await db.query(
      `SELECT *
       FROM refresh_tokens
       WHERE id = $1`,
      [id]
    );

    return response.rows[0] || null;
  }

  static async obtenerActivoPorHash(token_hash) {
    const response = await db.query(
      `SELECT *
       FROM refresh_tokens
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [token_hash]
    );

    return response.rows[0] || null;
  }

  static async revocarPorId(id) {
    const response = await db.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return response.rows[0] || null;
  }

  static async revocarPorHash(token_hash) {
    const response = await db.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE token_hash = $1
       RETURNING *`,
      [token_hash]
    );

    return response.rows[0] || null;
  }

  static async revocarActivosPorUsuario(usuario_id) {
    const response = await db.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE usuario_id = $1 AND revoked_at IS NULL
       RETURNING *`,
      [usuario_id]
    );

    return response.rows;
  }
}

module.exports = RefreshTokensModel;
