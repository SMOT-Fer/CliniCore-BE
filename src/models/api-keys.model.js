const db = require('../config/db');
const crypto = require('crypto');

class ApiKeysModel {
  static hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  static generateKey() {
    return `sk_${crypto.randomBytes(32).toString('hex')}`;
  }

  static async listarPorClinica({ clinicaId, filter = {} }) {
    let query = `
      SELECT id, clinica_id, nombre, key_prefix, estado, scopes, 
             ultimo_uso, creado_por, created_at, updated_at
      FROM api_keys
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

  static async obtenerPorId({ clinicaId, keyId }) {
    const response = await db.query(
      `SELECT id, clinica_id, nombre, key_prefix, estado, scopes, 
              ultimo_uso, creado_por, created_at, updated_at
       FROM api_keys
       WHERE id::text = $1 AND clinica_id = $2`,
      [keyId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async obtenerPorHash({ keyHash }) {
    const response = await db.query(
      `SELECT id, clinica_id, nombre, key_prefix, estado, scopes,
              ultimo_uso, creado_por, created_at, updated_at
       FROM api_keys
       WHERE key_hash = $1 AND estado = 'ACTIVA'
       LIMIT 1`,
      [keyHash]
    );
    return response.rows[0] || null;
  }

  static async crear({ clinicaId, payload, creadoPor }) {
    const { nombre, scopes = ['READ'] } = payload;
    const nuevoKey = this.generateKey();
    const keyPrefix = nuevoKey.substring(0, 20);
    const keyHash = this.hashKey(nuevoKey);

    const response = await db.query(
      `INSERT INTO api_keys (clinica_id, nombre, key_prefix, key_hash, estado, scopes, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, clinica_id, nombre, key_prefix, estado, scopes, creado_por, created_at, updated_at`,
      [clinicaId, nombre, keyPrefix, keyHash, 'ACTIVA', JSON.stringify(scopes), creadoPor]
    );

    return {
      ...response.rows[0],
      api_key: nuevoKey, // Solo se retorna una vez al crear
    };
  }

  static async actualizar({ clinicaId, keyId, payload }) {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (payload.nombre !== undefined) {
      updates.push(`nombre = $${paramIndex++}`);
      params.push(payload.nombre);
    }
    if (payload.scopes !== undefined) {
      updates.push(`scopes = $${paramIndex++}`);
      params.push(JSON.stringify(payload.scopes));
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = NOW()`);
    params.push(keyId);
    params.push(clinicaId);

    const response = await db.query(
      `UPDATE api_keys
       SET ${updates.join(', ')}
       WHERE id::text = $${paramIndex++} AND clinica_id = $${paramIndex}
       RETURNING id, clinica_id, nombre, key_prefix, estado, scopes, creado_por, created_at, updated_at`,
      params
    );
    return response.rows[0] || null;
  }

  static async revocar({ clinicaId, keyId }) {
    const response = await db.query(
      `UPDATE api_keys
       SET estado = 'REVOCADA', updated_at = NOW()
       WHERE id::text = $1 AND clinica_id = $2
       RETURNING id, estado, updated_at`,
      [keyId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async actualizarUltimoUso({ keyId }) {
    await db.query(
      `UPDATE api_keys SET ultimo_uso = NOW() WHERE id = $1`,
      [keyId]
    );
  }

  static async eliminar({ clinicaId, keyId }) {
    const response = await db.query(
      `DELETE FROM api_keys
       WHERE id::text = $1 AND clinica_id = $2
       RETURNING id`,
      [keyId, clinicaId]
    );
    return response.rows[0] || null;
  }
}

module.exports = ApiKeysModel;
