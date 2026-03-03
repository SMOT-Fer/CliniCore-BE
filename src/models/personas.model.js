const db = require('../config/db');

class PersonasModel {
  static async obtenerTodas() {
    const response = await db.query(
      `SELECT *
       FROM personas
       ORDER BY created_at DESC`
    );
    return response.rows;
  }

  static async obtenerPorIdIncluyendoEliminadas(id) {
    const response = await db.query(
      'SELECT * FROM personas WHERE id = $1',
      [id]
    );
    return response.rows[0] || null;
  }

  static async obtenerPorId(id) {
    const response = await db.query(
      'SELECT * FROM personas WHERE id = $1',
      [id]
    );
    return response.rows[0] || null;
  }

  static async obtenerPorDni(dni) {
    const response = await db.query(
      'SELECT * FROM personas WHERE dni = $1',
      [dni]
    );
    return response.rows[0] || null;
  }

  static async crear(datos) {
    const { dni, nombres, apellido_paterno, apellido_materno, sexo, fecha_nacimiento } = datos;

    const response = await db.query(
      `INSERT INTO personas (dni, nombres, apellido_paterno, apellido_materno, sexo, fecha_nacimiento)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [dni, nombres, apellido_paterno, apellido_materno, sexo, fecha_nacimiento]
    );

    return response.rows[0];
  }

  static async actualizar(id, datos) {
    const camposActualizables = {
      dni: datos.dni,
      nombres: datos.nombres,
      apellido_paterno: datos.apellido_paterno,
      apellido_materno: datos.apellido_materno,
      sexo: datos.sexo,
      fecha_nacimiento: datos.fecha_nacimiento
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
      `UPDATE personas SET ${setClause} WHERE id = $${valores.length}
       RETURNING *`,
      valores
    );

    return response.rows[0] || null;
  }

  /**
   * Hard delete: solo para datos de prueba o desarrollo
   * ¡NUNCA en producción!
   */
  static async eliminar(id) {
    await db.query('DELETE FROM personas WHERE id = $1', [id]);
    return true;
  }

  static async existeDni(dni) {
    const response = await db.query(
      'SELECT id FROM personas WHERE dni = $1',
      [dni]
    );
    return response.rows.length > 0;
  }
}

module.exports = PersonasModel;
