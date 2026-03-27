const db = require('../config/db');

class FacturasClinicaModel {
  static async listarPorClinica({ clinicaId, filter = {} }) {
    let query = `
      SELECT id, clinica_id, numero_factura, estado, monto_total, moneda, 
             periodo_inicio, periodo_fin, fecha_emision, fecha_vencimiento, 
             nombre_cliente, email_cliente, detalles, notas, created_at, updated_at
      FROM facturas_clinica
      WHERE clinica_id = $1
    `;
    const params = [clinicaId];

    if (filter.estado) {
      query += ` AND estado = $${params.length + 1}`;
      params.push(filter.estado);
    }

    if (filter.moneda) {
      query += ` AND moneda = $${params.length + 1}`;
      params.push(filter.moneda);
    }

    query += ` ORDER BY fecha_emision DESC`;

    const response = await db.query(query, params);
    return response.rows;
  }

  static async obtenerPorId({ clinicaId, facturaId }) {
    const response = await db.query(
      `SELECT id, clinica_id, numero_factura, estado, monto_total, moneda,
              periodo_inicio, periodo_fin, fecha_emision, fecha_vencimiento,
              nombre_cliente, email_cliente, detalles, notas, created_at, updated_at
       FROM facturas_clinica
       WHERE id::text = $1 AND clinica_id = $2`,
      [facturaId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async crear({ clinicaId, payload }) {
    const {
      numero_factura,
      estado = 'BORRADOR',
      monto_total,
      moneda = 'PEN',
      periodo_inicio,
      periodo_fin,
      nombre_cliente,
      email_cliente,
      detalles = [],
      notas = '',
    } = payload;

    const fecha_emision = new Date();
    const fecha_vencimiento = new Date();
    fecha_vencimiento.setDate(fecha_vencimiento.getDate() + 30);

    const response = await db.query(
      `INSERT INTO facturas_clinica 
       (clinica_id, numero_factura, estado, monto_total, moneda, periodo_inicio, periodo_fin,
        fecha_emision, fecha_vencimiento, nombre_cliente, email_cliente, detalles, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, clinica_id, numero_factura, estado, monto_total, moneda, periodo_inicio, 
                 periodo_fin, fecha_emision, fecha_vencimiento, nombre_cliente, email_cliente, 
                 detalles, notas, created_at, updated_at`,
      [clinicaId, numero_factura, estado, monto_total, moneda, periodo_inicio, periodo_fin,
       fecha_emision, fecha_vencimiento, nombre_cliente, email_cliente, JSON.stringify(detalles), notas]
    );
    return response.rows[0];
  }

  static async actualizar({ clinicaId, facturaId, payload }) {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (payload.estado !== undefined) {
      updates.push(`estado = $${paramIndex++}`);
      params.push(payload.estado);
    }
    if (payload.monto_total !== undefined) {
      updates.push(`monto_total = $${paramIndex++}`);
      params.push(payload.monto_total);
    }
    if (payload.detalles !== undefined) {
      updates.push(`detalles = $${paramIndex++}`);
      params.push(JSON.stringify(payload.detalles));
    }
    if (payload.notas !== undefined) {
      updates.push(`notas = $${paramIndex++}`);
      params.push(payload.notas);
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = NOW()`);
    params.push(facturaId);
    params.push(clinicaId);

    const response = await db.query(
      `UPDATE facturas_clinica
       SET ${updates.join(', ')}
       WHERE id::text = $${paramIndex++} AND clinica_id = $${paramIndex}
       RETURNING id, clinica_id, numero_factura, estado, monto_total, moneda, periodo_inicio,
                 periodo_fin, fecha_emision, fecha_vencimiento, nombre_cliente, email_cliente,
                 detalles, notas, created_at, updated_at`,
      params
    );
    return response.rows[0] || null;
  }

  static async cambiarEstado({ clinicaId, facturaId, nuevoEstado }) {
    const response = await db.query(
      `UPDATE facturas_clinica
       SET estado = $1, updated_at = NOW()
       WHERE id::text = $2 AND clinica_id = $3
       RETURNING id, estado, updated_at`,
      [nuevoEstado, facturaId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async eliminar({ clinicaId, facturaId }) {
    const response = await db.query(
      `DELETE FROM facturas_clinica
       WHERE id::text = $1 AND clinica_id = $2
       RETURNING id`,
      [facturaId, clinicaId]
    );
    return response.rows[0] || null;
  }

  static async obtenerUltimoNumero({ clinicaId }) {
    const response = await db.query(
      `SELECT numero_factura FROM facturas_clinica
       WHERE clinica_id = $1
       ORDER BY numero_factura DESC
       LIMIT 1`,
      [clinicaId]
    );
    if (!response.rows[0]) return 1;
    const lastNum = parseInt(response.rows[0].numero_factura.split('-')[1] || 0, 10);
    return lastNum + 1;
  }

  static async sumaryPorEstado({ clinicaId }) {
    const response = await db.query(
      `SELECT estado, COUNT(*) as total, SUM(monto_total) as suma
       FROM facturas_clinica
       WHERE clinica_id = $1
       GROUP BY estado`,
      [clinicaId]
    );
    return response.rows;
  }
}

module.exports = FacturasClinicaModel;
