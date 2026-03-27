const db = require('../config/db');

class OutboxEventosModel {
  static async crear({ payload }) {
    const { entidad, tipo_evento, entidad_id, datos = {}, procesado = false } = payload;

    const response = await db.query(
      `INSERT INTO outbox_eventos 
       (entidad, tipo_evento, entidad_id, datos, procesado, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, entidad, tipo_evento, entidad_id, datos, procesado, created_at`,
      [entidad, tipo_evento, entidad_id, JSON.stringify(datos), procesado]
    );
    return response.rows[0];
  }

  static async listarSinProcesar({ limite = 100 } = {}) {
    const response = await db.query(
      `SELECT id, entidad, tipo_evento, entidad_id, datos, created_at
       FROM outbox_eventos
       WHERE procesado = false
       ORDER BY created_at ASC
       LIMIT $1`,
      [limite]
    );
    return response.rows;
  }

  static async marcarProcesado({ eventoId }) {
    const response = await db.query(
      `UPDATE outbox_eventos
       SET procesado = true, procesado_en = NOW()
       WHERE id = $1
       RETURNING id, procesado, procesado_en`,
      [eventoId]
    );
    return response.rows[0] || null;
  }

  static async limpiarProcesados({ diasRetencion = 90 } = {}) {
    const response = await db.query(
      `DELETE FROM outbox_eventos
       WHERE procesado = true 
         AND procesado_en < NOW() - INTERVAL '${diasRetencion} days'
       RETURNING id`
    );
    return response.rowCount;
  }

  static async listar({ filtro = {} } = {}) {
    let query = `
      SELECT id, entidad, tipo_evento, entidad_id, datos, procesado,
             created_at, procesado_en
      FROM outbox_eventos
      WHERE 1=1
    `;
    const params = [];

    if (filtro.entidad) {
      query += ` AND entidad = $${params.length + 1}`;
      params.push(filtro.entidad);
    }

    if (filtro.procesado !== undefined) {
      query += ` AND procesado = $${params.length + 1}`;
      params.push(filtro.procesado);
    }

    query += ` ORDER BY created_at DESC LIMIT 1000`;

    const response = await db.query(query, params);
    return response.rows;
  }
}

module.exports = OutboxEventosModel;
