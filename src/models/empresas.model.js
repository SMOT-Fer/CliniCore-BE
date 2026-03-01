const db = require('../config/db');

class EmpresasModel {
  static async obtenerActivasPublicas() {
    const response = await db.query(
      `SELECT id, nombre, ruc, estado, direccion, telefono, tipo_negocio_id, created_at
       FROM empresas
       WHERE estado = 'ACTIVA' AND deleted_at IS NULL
       ORDER BY nombre ASC`
    );
    return response.rows;
  }

  static async obtenerTodas() {
    const response = await db.query(
      `SELECT *
       FROM empresas
       ORDER BY
         CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END ASC,
         CASE WHEN deleted_at IS NULL THEN created_at END DESC,
         CASE WHEN deleted_at IS NOT NULL THEN deleted_at END DESC`
    );
    return response.rows;
  }

  static async obtenerPorIdIncluyendoEliminadas(id) {
    const response = await db.query(
      `SELECT *
       FROM empresas
       WHERE id = $1`,
      [id]
    );
    return response.rows[0] || null;
  }

  static async obtenerPorId(id) {
    const response = await db.query(
      `SELECT *
       FROM empresas
       WHERE id = $1
         AND deleted_at IS NULL`,
      [id]
    );
    return response.rows[0] || null;
  }

  static async crear(datos) {
    const { nombre, ruc, estado, direccion, telefono, tipo_negocio_id } = datos;

    const response = await db.query(
      `INSERT INTO empresas (nombre, ruc, estado, direccion, telefono, tipo_negocio_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nombre, ruc || null, estado || 'ACTIVA', direccion || null, telefono || null, tipo_negocio_id]
    );

    return response.rows[0];
  }

  static async actualizar(id, datos) {
    const camposActualizables = {
      nombre: datos.nombre,
      ruc: datos.ruc,
      estado: datos.estado,
      direccion: datos.direccion,
      telefono: datos.telefono,
      tipo_negocio_id: datos.tipo_negocio_id
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
      `UPDATE empresas
       SET ${setClause}
       WHERE id = $${valores.length}
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
      `UPDATE empresas
       SET deleted_at = NOW(), deleted_by = $2, estado = 'INACTIVA'
       WHERE id = $1
         AND deleted_at IS NULL
       RETURNING *`,
      [id, deletedByUserId]
    );

    return response.rows[0] || null;
  }

  static async reactivar(id) {
    const response = await db.query(
      `UPDATE empresas
       SET deleted_at = NULL,
           deleted_by = NULL,
           estado = 'ACTIVA'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return response.rows[0] || null;
  }

  /**
   * Hard delete: solo para datos de prueba o desarrollo
   * ¡NUNCA en producción!
   */
  static async eliminar(id) {
    await db.query('DELETE FROM empresas WHERE id = $1', [id]);
    return true;
  }

  static async existeRuc(ruc) {
    const response = await db.query(
      `SELECT id
       FROM empresas
       WHERE ruc = $1
         AND deleted_at IS NULL`,
      [ruc]
    );
    return response.rows.length > 0;
  }
}

module.exports = EmpresasModel;
