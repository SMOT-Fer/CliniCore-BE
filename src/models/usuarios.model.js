const db = require('../config/db');

const CAMPOS_VISIBLES = `
  id,
  empresa_id,
  empresa_id AS clinica_id,
  persona_id,
  email,
  rol,
  estado,
  deleted_at,
  deleted_by,
  ultimo_login_at,
  created_at,
  updated_at
`;

class UsuariosModel {
  static async obtenerContextoEmpresa(usuarioId) {
    const response = await db.query(
      `SELECT
          e.id,
          e.nombre,
          e.estado,
          e.tipo_negocio_id,
          tn.codigo AS tipo_negocio_codigo,
          tn.nombre AS tipo_negocio_nombre
       FROM usuarios u
       LEFT JOIN empresas e ON e.id = u.empresa_id
       LEFT JOIN tipos_negocio tn ON tn.id = e.tipo_negocio_id
       WHERE u.id = $1
       LIMIT 1`,
      [usuarioId]
    );

    return response.rows[0] || null;
  }

  static async obtenerTodos() {
    const response = await db.query(
      `SELECT ${CAMPOS_VISIBLES}
       FROM usuarios
       ORDER BY
         CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END,
         CASE WHEN deleted_at IS NULL THEN created_at END DESC,
         CASE WHEN deleted_at IS NOT NULL THEN deleted_at END DESC`
    );
    return response.rows;
  }

  static async obtenerPorIdIncluyendoEliminados(id) {
    const response = await db.query(
      `SELECT ${CAMPOS_VISIBLES}
       FROM usuarios
       WHERE id = $1`,
      [id]
    );
    return response.rows[0] || null;
  }

  static async obtenerPorId(id) {
    const response = await db.query(
      `SELECT ${CAMPOS_VISIBLES}
       FROM usuarios
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return response.rows[0] || null;
  }

  static async obtenerPorEmailConPassword(email) {
    const response = await db.query(
      `SELECT *
       FROM usuarios
       WHERE UPPER(email) = UPPER($1) AND deleted_at IS NULL`,
      [email]
    );
    return response.rows[0] || null;
  }

  static async crear(datos) {
    const empresaId = datos.empresa_id ?? datos.clinica_id ?? null;
    const { persona_id, email, password_hash, rol, estado } = datos;

    const response = await db.query(
      `INSERT INTO usuarios (empresa_id, persona_id, email, password_hash, rol, estado)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${CAMPOS_VISIBLES}`,
      [empresaId, persona_id, email, password_hash, rol, estado || 'ACTIVO']
    );

    return response.rows[0];
  }

  static async actualizar(id, datos) {
    const empresaId = datos.empresa_id ?? datos.clinica_id;

    const camposActualizables = {
      empresa_id: empresaId,
      persona_id: datos.persona_id,
      email: datos.email,
      password_hash: datos.password_hash,
      rol: datos.rol,
      estado: datos.estado
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
      `UPDATE usuarios SET ${setClause} WHERE id = $${valores.length}
       RETURNING ${CAMPOS_VISIBLES}`,
      valores
    );

    return response.rows[0] || null;
  }

  static async actualizarUltimoLogin(id) {
    const response = await db.query(
      `UPDATE usuarios
       SET ultimo_login_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING ${CAMPOS_VISIBLES}`,
      [id]
    );

    return response.rows[0] || null;
  }

  /**
   * Soft delete: marca usuario como eliminado pero mantiene datos
   * Para auditoría y cumplimiento legal
   */
  static async softDelete(id, deletedByUserId) {
    const response = await db.query(
      `UPDATE usuarios
       SET deleted_at = NOW(), deleted_by = $2, estado = 'INACTIVO'
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING ${CAMPOS_VISIBLES}`,
      [id, deletedByUserId]
    );

    return response.rows[0] || null;
  }

  static async reactivar(id) {
    const response = await db.query(
      `UPDATE usuarios
       SET deleted_at = NULL,
           deleted_by = NULL,
           estado = 'ACTIVO'
       WHERE id = $1
       RETURNING ${CAMPOS_VISIBLES}`,
      [id]
    );

    return response.rows[0] || null;
  }

  /**
   * Hard delete: solo para datos de prueba o desarrollo
   * ¡NUNCA en producción!
   */
  static async eliminar(id) {
    await db.query('DELETE FROM usuarios WHERE id = $1', [id]);
    return true;
  }

  static async existeEmail(email) {
    const response = await db.query(
      'SELECT id FROM usuarios WHERE UPPER(email) = UPPER($1) AND deleted_at IS NULL',
      [email]
    );
    return response.rows.length > 0;
  }

  static async existePersona(personaId) {
    const response = await db.query(
      'SELECT id FROM usuarios WHERE persona_id = $1 AND deleted_at IS NULL',
      [personaId]
    );
    return response.rows.length > 0;
  }
}

module.exports = UsuariosModel;
