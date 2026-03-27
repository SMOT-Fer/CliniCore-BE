const db = require('../config/db');

class WebhookEventosPagoModel {
  static async listarPorClinica({ clinicaId, filter = {} }) {
    let query = `
      SELECT id, clinica_id, proveedor, evento_tipo, referencia_externa, 
             estado_procesamiento, payload_evento, error_procesamiento, created_at, updated_at
      FROM webhook_eventos_pago
      WHERE clinica_id = $1
    `;
    const params = [clinicaId];

    if (filter.estado_procesamiento) {
      query += ` AND estado_procesamiento = $${params.length + 1}`;
      params.push(filter.estado_procesamiento);
    }

    if (filter.proveedor) {
      query += ` AND proveedor = $${params.length + 1}`;
      params.push(filter.proveedor);
    }

    query += ` ORDER BY created_at DESC LIMIT 1000`;

    const response = await db.query(query, params);
    return response.rows;
  }

  static async obtenerPorId({ clinicaId, eventoId }) {
    const response = await db.query(
      `SELECT id, clinica_id, proveedor, evento_tipo, referencia_externa,
              estado_procesamiento, payload_evento, error_procesamiento, created_at, updated_at
       FROM webhook_eventos_pago
       WHERE id::text = $1 AND clinica_id = $2`,
      [eventoId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async crear({ clinicaId, payload }) {
    const {
      proveedor,
      evento_tipo,
      referencia_externa,
      payload_evento = {},
      estado_procesamiento = 'PENDIENTE',
    } = payload;

    const response = await db.query(
      `INSERT INTO webhook_eventos_pago
       (clinica_id, proveedor, evento_tipo, referencia_externa, payload_evento, estado_procesamiento)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, clinica_id, proveedor, evento_tipo, referencia_externa,
                 estado_procesamiento, payload_evento, error_procesamiento, created_at, updated_at`,
      [clinicaId, proveedor, evento_tipo, referencia_externa, JSON.stringify(payload_evento), estado_procesamiento]
    );
    return response.rows[0];
  }

  static async marcarProcesado({ clinicaId, eventoId }) {
    const response = await db.query(
      `UPDATE webhook_eventos_pago
       SET estado_procesamiento = 'PROCESADO', error_procesamiento = NULL, updated_at = NOW()
       WHERE id::text = $1 AND clinica_id = $2
       RETURNING id, estado_procesamiento, updated_at`,
      [eventoId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async marcarError({ clinicaId, eventoId, errorMsg }) {
    const response = await db.query(
      `UPDATE webhook_eventos_pago
       SET estado_procesamiento = 'ERROR', error_procesamiento = $1, updated_at = NOW()
       WHERE id::text = $2 AND clinica_id = $3
       RETURNING id, estado_procesamiento, error_procesamiento, updated_at`,
      [errorMsg, eventoId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async obtenerPorReferenciaExterna({ referencia_externa }) {
    const response = await db.query(
      `SELECT id, clinica_id, proveedor, evento_tipo, estado_procesamiento, 
              payload_evento, error_procesamiento, created_at
       FROM webhook_eventos_pago
       WHERE referencia_externa = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [referencia_externa]
    );
    return response.rows[0] || null;
  }

  static async listarPendientes() {
    const response = await db.query(
      `SELECT id, clinica_id, proveedor, evento_tipo, referencia_externa,
              payload_evento, created_at
       FROM webhook_eventos_pago
       WHERE estado_procesamiento = 'PENDIENTE'
       ORDER BY created_at ASC
       LIMIT 100`
    );
    return response.rows;
  }

  static async limpiarAntiguos({ diasRetencion = 90 } = {}) {
    const response = await db.query(
      `DELETE FROM webhook_eventos_pago
       WHERE estado_procesamiento != 'ERROR'
         AND created_at < NOW() - INTERVAL '${diasRetencion} days'
       RETURNING id`
    );
    return response.rowCount;
  }
}

module.exports = WebhookEventosPagoModel;
