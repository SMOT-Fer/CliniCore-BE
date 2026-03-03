const db = require('../config/db');

class PlanesSaasModel {
  static async listarActivos() {
    const response = await db.query(
      `SELECT *
       FROM planes_saas
       WHERE estado = 'ACTIVO'
       ORDER BY precio_mensual ASC, nombre ASC`
    );
    return response.rows;
  }

  static async listarTodos() {
    const response = await db.query(
      `SELECT *
       FROM planes_saas
       ORDER BY
         CASE WHEN estado = 'ACTIVO' THEN 0 ELSE 1 END,
         precio_mensual ASC,
         nombre ASC`
    );
    return response.rows;
  }

  static async obtenerPorId(id) {
    const response = await db.query(
      `SELECT *
       FROM planes_saas
       WHERE id = $1`,
      [id]
    );

    return response.rows[0] || null;
  }

  static async obtenerPorCodigo(codigo) {
    const response = await db.query(
      `SELECT *
       FROM planes_saas
       WHERE UPPER(codigo) = UPPER($1)
       LIMIT 1`,
      [codigo]
    );

    return response.rows[0] || null;
  }

  static async crear(datos) {
    const {
      codigo,
      nombre,
      descripcion,
      moneda,
      precio_mensual,
      precio_anual,
      max_usuarios,
      max_pacientes_activos,
      max_storage_gb,
      incluye_facturacion_electronica,
      incluye_historia_clinica_avanzada,
      incluye_integraciones,
      incluye_api,
      dias_trial,
      estado
    } = datos;

    const response = await db.query(
      `INSERT INTO planes_saas (
         codigo,
         nombre,
         descripcion,
         moneda,
         precio_mensual,
         precio_anual,
         max_usuarios,
         max_pacientes_activos,
         max_storage_gb,
         incluye_facturacion_electronica,
         incluye_historia_clinica_avanzada,
         incluye_integraciones,
         incluye_api,
         dias_trial,
         estado
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        codigo,
        nombre,
        descripcion || null,
        moneda || 'PEN',
        precio_mensual ?? 0,
        precio_anual ?? 0,
        max_usuarios ?? null,
        max_pacientes_activos ?? null,
        max_storage_gb ?? null,
        Boolean(incluye_facturacion_electronica),
        Boolean(incluye_historia_clinica_avanzada),
        Boolean(incluye_integraciones),
        Boolean(incluye_api),
        dias_trial ?? 0,
        estado || 'ACTIVO'
      ]
    );

    return response.rows[0];
  }

  static async actualizar(id, datos) {
    const campos = {
      codigo: datos.codigo,
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      moneda: datos.moneda,
      precio_mensual: datos.precio_mensual,
      precio_anual: datos.precio_anual,
      max_usuarios: datos.max_usuarios,
      max_pacientes_activos: datos.max_pacientes_activos,
      max_storage_gb: datos.max_storage_gb,
      incluye_facturacion_electronica: datos.incluye_facturacion_electronica,
      incluye_historia_clinica_avanzada: datos.incluye_historia_clinica_avanzada,
      incluye_integraciones: datos.incluye_integraciones,
      incluye_api: datos.incluye_api,
      dias_trial: datos.dias_trial,
      estado: datos.estado
    };

    const keys = Object.keys(campos).filter((key) => campos[key] !== undefined);
    if (keys.length === 0) {
      return null;
    }

    const setClause = keys.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    const values = keys.map((key) => campos[key]);
    values.push(id);

    const response = await db.query(
      `UPDATE planes_saas
       SET ${setClause}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return response.rows[0] || null;
  }
}

module.exports = PlanesSaasModel;
