const db = require('../config/db');
const crypto = require('crypto');

class MfaChallengesModel {
  static async crear({ usuarioId, factorId }) {
    const codigoDesafio = crypto.randomInt(100000, 999999).toString();
    const expira = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    const response = await db.query(
      `INSERT INTO mfa_challenges (usuario_id, factor_id, codigo_desafio, expira_en, intentos_restantes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, usuario_id, factor_id, intentos_restantes, expira_en, created_at`,
      [usuarioId, factorId, codigoDesafio, expira, 3]
    );
    return response.rows[0];
  }

  static async obtenerActivo({ usuarioId, factorId }) {
    const response = await db.query(
      `SELECT id, usuario_id, factor_id, intentos_restantes, expira_en, created_at
       FROM mfa_challenges
       WHERE usuario_id::text = $1 AND factor_id::text = $2 
             AND resuelto = false AND expira_en > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [usuarioId, factorId]
    );
    return response.rows[0] || null;
  }

  static async obtenerPorId({ desafioId }) {
    const response = await db.query(
      `SELECT id, usuario_id, factor_id, codigo_desafio, intentos_restantes, 
              expira_en, resuelto, created_at, updated_at
       FROM mfa_challenges
       WHERE id::text = $1`,
      [desafioId]
    );
    return response.rows[0] || null;
  }

  static async marcarResuelto({ desafioId }) {
    const response = await db.query(
      `UPDATE mfa_challenges
       SET resuelto = true, updated_at = NOW()
       WHERE id::text = $1
       RETURNING id, resuelto, updated_at`,
      [desafioId]
    );
    return response.rows[0] || null;
  }

  static async decrementarIntentos({ desafioId }) {
    const response = await db.query(
      `UPDATE mfa_challenges
       SET intentos_restantes = intentos_restantes - 1, updated_at = NOW()
       WHERE id::text = $1
       RETURNING id, intentos_restantes`,
      [desafioId]
    );
    return response.rows[0] || null;
  }

  static async limpiarExpirados() {
    const response = await db.query(
      `DELETE FROM mfa_challenges
       WHERE expira_en < NOW() OR intentos_restantes <= 0
       RETURNING id`
    );
    return response.rowCount;
  }
}

module.exports = MfaChallengesModel;
