const db = require('../config/db');

class MfaFactorsModel {
  static async listarPorUsuario({ usuarioId }) {
    const response = await db.query(
      `SELECT id, usuario_id, tipo_factor, secreto_verificacion, codigo_backup, 
              verificado, ultimo_uso, estado, created_at, updated_at
       FROM mfa_factors
       WHERE usuario_id::text = $1
       ORDER BY created_at DESC`,
      [usuarioId]
    );
    return response.rows.map((row) => ({
      ...row,
      secreto_verificacion: undefined, // Nunca exponer secreto
    }));
  }

  static async obtenerPorId({ usuarioId, factorId }) {
    const response = await db.query(
      `SELECT id, usuario_id, tipo_factor, secreto_verificacion, codigo_backup,
              verificado, ultimo_uso, estado, created_at, updated_at
       FROM mfa_factors
       WHERE id::text = $1 AND usuario_id::text = $2`,
      [factorId, usuarioId]
    );
    return response.rows[0] || null;
  }

  static async crear({ usuarioId, payload }) {
    const { tipo_factor, secreto_verificacion, codigo_backup = [] } = payload;

    const response = await db.query(
      `INSERT INTO mfa_factors (usuario_id, tipo_factor, secreto_verificacion, codigo_backup, verificado, estado)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, usuario_id, tipo_factor, verificado, estado, created_at, updated_at`,
      [usuarioId, tipo_factor, secreto_verificacion, JSON.stringify(codigo_backup), false, 'ACTIVO']
    );
    return response.rows[0];
  }

  static async marcarVerificado({ usuarioId, factorId }) {
    const response = await db.query(
      `UPDATE mfa_factors
       SET verificado = true, updated_at = NOW()
       WHERE id::text = $1 AND usuario_id::text = $2
       RETURNING id, verificado, updated_at`,
      [factorId, usuarioId]
    );
    return response.rows[0] || null;
  }

  static async actualizarUltimoUso({ factorId }) {
    await db.query(
      `UPDATE mfa_factors SET ultimo_uso = NOW() WHERE id::text = $1`,
      [factorId]
    );
  }

  static async desactivar({ usuarioId, factorId }) {
    const response = await db.query(
      `UPDATE mfa_factors
       SET estado = 'INACTIVO', updated_at = NOW()
       WHERE id::text = $1 AND usuario_id::text = $2
       RETURNING id, estado, updated_at`,
      [factorId, usuarioId]
    );
    return response.rows[0] || null;
  }

  static async eliminar({ usuarioId, factorId }) {
    const response = await db.query(
      `DELETE FROM mfa_factors
       WHERE id::text = $1 AND usuario_id::text = $2
       RETURNING id`,
      [factorId, usuarioId]
    );
    return response.rows[0] || null;
  }

  static async contarVerificados({ usuarioId }) {
    const response = await db.query(
      `SELECT COUNT(*) as total FROM mfa_factors
       WHERE usuario_id::text = $1 AND verificado = true AND estado = 'ACTIVO'`,
      [usuarioId]
    );
    return parseInt(response.rows[0].total, 10);
  }

  static async obtenerConSecreto({ usuarioId, factorId }) {
    const response = await db.query(
      `SELECT id, usuario_id, tipo_factor, secreto_verificacion, codigo_backup,
              verificado, estado, created_at, updated_at
       FROM mfa_factors
       WHERE id::text = $1 AND usuario_id::text = $2`,
      [factorId, usuarioId]
    );
    return response.rows[0] || null;
  }
}

module.exports = MfaFactorsModel;
