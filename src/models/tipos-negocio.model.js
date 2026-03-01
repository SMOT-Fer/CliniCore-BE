const db = require('../config/db');

class TiposNegocioModel {
  static async listarTodos() {
    const response = await db.query(
      `SELECT id, codigo, nombre
       FROM tipos_negocio
       ORDER BY nombre ASC`
    );
    return response.rows;
  }

  static async obtenerPorId(id) {
    const response = await db.query(
      `SELECT id, codigo, nombre
       FROM tipos_negocio
       WHERE id = $1`,
      [id]
    );
    return response.rows[0] || null;
  }

  static async obtenerPorCodigo(codigo) {
    const response = await db.query(
      `SELECT id, codigo, nombre
       FROM tipos_negocio
       WHERE UPPER(codigo) = UPPER($1)
       LIMIT 1`,
      [codigo]
    );
    return response.rows[0] || null;
  }

  static async crear({ codigo, nombre }) {
    const response = await db.query(
      `INSERT INTO tipos_negocio (codigo, nombre)
       VALUES ($1, $2)
       RETURNING id, codigo, nombre`,
      [codigo, nombre]
    );
    return response.rows[0];
  }

  static async actualizar(id, { codigo, nombre }) {
    const campos = {
      codigo,
      nombre
    };

    const camposValidos = Object.entries(campos)
      .filter(([_, value]) => value !== undefined)
      .map(([key]) => key);

    if (camposValidos.length === 0) {
      return null;
    }

    const setClause = camposValidos.map((campo, idx) => `${campo} = $${idx + 1}`).join(', ');
    const valores = camposValidos.map((campo) => campos[campo]);
    valores.push(id);

    const response = await db.query(
      `UPDATE tipos_negocio
       SET ${setClause}
       WHERE id = $${valores.length}
       RETURNING id, codigo, nombre`,
      valores
    );

    return response.rows[0] || null;
  }

  static async eliminar(id) {
    const response = await db.query(
      `DELETE FROM tipos_negocio
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    return response.rows[0] || null;
  }
}

module.exports = TiposNegocioModel;
