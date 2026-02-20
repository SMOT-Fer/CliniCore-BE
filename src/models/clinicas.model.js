const db = require('../config/db');

class ClinicasModel {
  static async obtenerActivasPublicas() {
    const response = await db.query(
      `SELECT id, nombre, direccion, telefono, estado, created_at
       FROM clinicas
       WHERE estado = 'ACTIVA' AND deleted_at IS NULL
       ORDER BY nombre ASC`
    );
    return response.rows;
  }

  static async obtenerTodas() {
    const response = await db.query(
      'SELECT * FROM clinicas WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
    return response.rows;
  }

  static async obtenerPorId(id) {
    const response = await db.query(
      'SELECT * FROM clinicas WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return response.rows[0] || null;
  }

  static async crear(datos) {
    const { nombre, ruc, estado, direccion, telefono } = datos;

    const response = await db.query(
      `INSERT INTO clinicas (nombre, ruc, estado, direccion, telefono)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nombre, ruc || null, estado || 'ACTIVA', direccion || null, telefono || null]
    );

    return response.rows[0];
  }

  static async actualizar(id, datos) {
    const camposActualizables = {
      nombre: datos.nombre,
      ruc: datos.ruc,
      estado: datos.estado,
      direccion: datos.direccion,
      telefono: datos.telefono
    };

    const camposValidos = Object.entries(camposActualizables)
      .filter(([_, value]) => value !== undefined)
      .map(([key]) => key);

    if (camposValidos.length === 0) {
      return null;
    }

    const setClause = camposValidos.map((campo, idx) => `${campo} = $${idx + 1}`).join(', ');
    const valores = camposValidos.map(campo => camposActualizables[campo]);
    valores.push(id);

    const response = await db.query(
      `UPDATE clinicas SET ${setClause} WHERE id = $${valores.length} AND deleted_at IS NULL
       RETURNING *`,
      valores
    );

    return response.rows[0] || null;
  }

  /**
   * Soft delete: marca clínica como eliminada pero mantiene datos
   * Para auditoría y cumplimiento legal
   */
  static async softDelete(id, deletedByUserId) {
    const response = await db.query(
      `UPDATE clinicas
       SET deleted_at = NOW(), deleted_by = $2
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id, deletedByUserId]
    );

    return response.rows.length > 0;
  }

  /**
   * Hard delete: solo para datos de prueba o desarrollo
   * ¡NUNCA en producción!
   */
  static async eliminar(id) {
    await db.query('DELETE FROM clinicas WHERE id = $1', [id]);
    return true;
  }

  static async existeRuc(ruc) {
    const response = await db.query(
      'SELECT id FROM clinicas WHERE ruc = $1 AND deleted_at IS NULL',
      [ruc]
    );
    return response.rows.length > 0;
  }
}

module.exports = ClinicasModel;
