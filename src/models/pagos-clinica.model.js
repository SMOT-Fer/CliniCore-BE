const db = require('../config/db');

class PagosClinicaModel {
  static async listarPorClinica({ clinicaId, filter = {} }) {
    let query = `
      SELECT id, clinica_id, factura_id, estado, monto, moneda, proveedor_pago,
             referencia_externa, metodo_pago, fecha_pago, fecha_proxima_reintento,
             numero_intentos, error_mensaje, detalles, created_at, updated_at
      FROM pagos_clinica
      WHERE clinica_id = $1
    `;
    const params = [clinicaId];

    if (filter.estado) {
      query += ` AND estado = $${params.length + 1}`;
      params.push(filter.estado);
    }

    if (filter.proveedor_pago) {
      query += ` AND proveedor_pago = $${params.length + 1}`;
      params.push(filter.proveedor_pago);
    }

    if (filter.factura_id) {
      query += ` AND factura_id::text = $${params.length + 1}`;
      params.push(filter.factura_id);
    }

    query += ` ORDER BY created_at DESC`;

    const response = await db.query(query, params);
    return response.rows;
  }

  static async obtenerPorId({ clinicaId, pagoId }) {
    const response = await db.query(
      `SELECT id, clinica_id, factura_id, estado, monto, moneda, proveedor_pago,
              referencia_externa, metodo_pago, fecha_pago, fecha_proxima_reintento,
              numero_intentos, error_mensaje, detalles, created_at, updated_at
       FROM pagos_clinica
       WHERE id::text = $1 AND clinica_id = $2`,
      [pagoId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async obtenerPorReferencia({ referencia_externa }) {
    const response = await db.query(
      `SELECT id, clinica_id, factura_id, estado, monto, moneda, proveedor_pago,
              referencia_externa, metodo_pago, fecha_pago, fecha_proxima_reintento,
              numero_intentos, error_mensaje, detalles, created_at, updated_at
       FROM pagos_clinica
       WHERE referencia_externa = $1
       LIMIT 1`,
      [referencia_externa]
    );
    return response.rows[0] || null;
  }

  static async crear({ clinicaId, payload }) {
    const {
      factura_id,
      estado = 'PENDIENTE',
      monto,
      moneda = 'PEN',
      proveedor_pago,
      metodo_pago,
      referencia_externa,
      detalles = {},
    } = payload;

    const response = await db.query(
      `INSERT INTO pagos_clinica
       (clinica_id, factura_id, estado, monto, moneda, proveedor_pago, metodo_pago, 
        referencia_externa, numero_intentos, detalles)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, clinica_id, factura_id, estado, monto, moneda, proveedor_pago,
                 referencia_externa, metodo_pago, fecha_pago, fecha_proxima_reintento,
                 numero_intentos, error_mensaje, detalles, created_at, updated_at`,
      [clinicaId, factura_id, estado, monto, moneda, proveedor_pago, metodo_pago,
       referencia_externa, 0, JSON.stringify(detalles)]
    );
    return response.rows[0];
  }

  static async actualizar({ clinicaId, pagoId, payload }) {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (payload.estado !== undefined) {
      updates.push(`estado = $${paramIndex++}`);
      params.push(payload.estado);
    }
    if (payload.fecha_pago !== undefined) {
      updates.push(`fecha_pago = $${paramIndex++}`);
      params.push(payload.fecha_pago);
    }
    if (payload.error_mensaje !== undefined) {
      updates.push(`error_mensaje = $${paramIndex++}`);
      params.push(payload.error_mensaje);
    }
    if (payload.numero_intentos !== undefined) {
      updates.push(`numero_intentos = $${paramIndex++}`);
      params.push(payload.numero_intentos);
    }
    if (payload.detalles !== undefined) {
      updates.push(`detalles = $${paramIndex++}`);
      params.push(JSON.stringify(payload.detalles));
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = NOW()`);
    params.push(pagoId);
    params.push(clinicaId);

    const response = await db.query(
      `UPDATE pagos_clinica
       SET ${updates.join(', ')}
       WHERE id::text = $${paramIndex++} AND clinica_id = $${paramIndex}
       RETURNING id, clinica_id, factura_id, estado, monto, moneda, proveedor_pago,
                 referencia_externa, metodo_pago, fecha_pago, fecha_proxima_reintento,
                 numero_intentos, error_mensaje, detalles, created_at, updated_at`,
      params
    );
    return response.rows[0] || null;
  }

  static async marcarCompletado({ clinicaId, pagoId }) {
    return this.actualizar({ clinicaId, pagoId, payload: { estado: 'COMPLETADO', fecha_pago: new Date() } });
  }

  static async marcarRechazado({ clinicaId, pagoId, errorMsg }) {
    return this.actualizar({ clinicaId, pagoId, payload: { estado: 'RECHAZADO', error_mensaje: errorMsg } });
  }

  static async marcarEnReintento({ clinicaId, pagoId, fechaReintento }) {
    const response = await db.query(
      `UPDATE pagos_clinica
       SET estado = 'EN_REINTENTO', 
           fecha_proxima_reintento = $1,
           numero_intentos = numero_intentos + 1,
           updated_at = NOW()
       WHERE id::text = $2 AND clinica_id = $3
       RETURNING id, estado, numero_intentos, fecha_proxima_reintento`,
      [fechaReintento, pagoId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async eliminar({ clinicaId, pagoId }) {
    const response = await db.query(
      `DELETE FROM pagos_clinica
       WHERE id::text = $1 AND clinica_id = $2
       RETURNING id`,
      [pagoId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async sumaryPorEstado({ clinicaId }) {
    const response = await db.query(
      `SELECT estado, COUNT(*) as total, SUM(monto) as suma
       FROM pagos_clinica
       WHERE clinica_id = $1
       GROUP BY estado`,
      [clinicaId]
    );
    return response.rows;
  }

  static async listarParaReintento({ horaMaximaReintento = 5 }) {
    const response = await db.query(
      `SELECT id, clinica_id, factura_id, estado, monto, proveedor_pago,
              referencia_externa, numero_intentos
       FROM pagos_clinica
       WHERE estado = 'EN_REINTENTO'
         AND fecha_proxima_reintento <= NOW()
         AND numero_intentos < $1
       ORDER BY fecha_proxima_reintento ASC
       LIMIT 100`,
      [horaMaximaReintento]
    );
    return response.rows;
  }
}

module.exports = PagosClinicaModel;
