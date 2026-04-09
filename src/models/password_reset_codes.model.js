const db = require('../config/db');
const crypto = require('crypto');

class PasswordResetCodesModel {
  /**
   * Genera un código alfanumérico de 6 caracteres (mayúsculas y números)
   */
  static generarCodigo() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 6; i++) {
      codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
  }

  /**
   * Crea un nuevo código de recuperación
   * Invalida códigos anteriores del mismo email
   */
  static async crear(email) {
    // Invalidar códigos anteriores
    await db.query(
      `UPDATE password_reset_codes 
       SET used_at = NOW() 
       WHERE email = $1 AND used_at IS NULL`,
      [email.toUpperCase()]
    );

    const codigo = this.generarCodigo();
    const codigoHash = crypto.createHash('sha256').update(codigo).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    const response = await db.query(
      `INSERT INTO password_reset_codes (email, code_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, email, expires_at, created_at`,
      [email.toUpperCase(), codigoHash, expiresAt]
    );

    return {
      ...response.rows[0],
      codigo // Devolvemos el código sin hashear para enviarlo por email
    };
  }

  /**
   * Verifica si un código es válido
   */
  static async verificar(email, codigo) {
    const codigoHash = crypto.createHash('sha256').update(codigo.toUpperCase()).digest('hex');

    const response = await db.query(
      `SELECT id, email, expires_at, used_at
       FROM password_reset_codes
       WHERE email = $1 
         AND code_hash = $2 
         AND used_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [email.toUpperCase(), codigoHash]
    );

    return response.rows[0] || null;
  }

  /**
   * Marca un código como usado
   */
  static async marcarUsado(id) {
    const response = await db.query(
      `UPDATE password_reset_codes
       SET used_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return response.rows[0] || null;
  }

  /**
   * Limpia códigos expirados (para cron job)
   */
  static async limpiarExpirados() {
    const response = await db.query(
      `DELETE FROM password_reset_codes
       WHERE expires_at < NOW() OR used_at IS NOT NULL`
    );

    return response.rowCount;
  }
}

module.exports = PasswordResetCodesModel;
