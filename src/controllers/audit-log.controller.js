const db = require('../config/db');

/**
 * Controlador para acceso a audit logs
 * Permite a SUPERADMIN ver historia de cambios
 */
class AuditLogController {
  /**
   * GET /api/audit-logs - Listar cambios con filtros
   * @query {string} tabla_nombre - Filtrar por tabla (ej: usuarios)
   * @query {string} operacion - Filtrar por operación (CREATE, UPDATE, DELETE)
   * @query {string} registro_id - ID específico del registro
   * @query {number} limit - Límite de resultados (default 100, max 500)
   * @query {number} offset - Offset para paginación
   */
  static async listar(req, res) {
    try {
      const { tabla_nombre, operacion, registro_id, limit = 100, offset = 0 } = req.query;
      const limitNum = Math.min(parseInt(limit) || 100, 500);
      const offsetNum = parseInt(offset) || 0;

      let query = 'SELECT * FROM audit_log WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (tabla_nombre) {
        query += ` AND tabla_nombre = $${paramIndex}`;
        params.push(tabla_nombre);
        paramIndex++;
      }

      if (operacion) {
        query += ` AND operacion = $${paramIndex}`;
        params.push(operacion.toUpperCase());
        paramIndex++;
      }

      if (registro_id) {
        query += ` AND registro_id = $${paramIndex}`;
        params.push(registro_id);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limitNum, offsetNum);

      const result = await db.query(query, params);

      return res.json({
        success: true,
        data: {
          logs: result.rows,
          pagination: {
            limit: limitNum,
            offset: offsetNum,
            total: result.rows.length
          }
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Error al recuperar audit logs'
      });
    }
  }

  /**
   * GET /api/audit-logs/:recordId - Ver historia completa de un registro
   */
  static async verHistoria(req, res) {
    try {
      const { recordId } = req.params;

      const result = await db.query(
        `SELECT 
          id,
          usuario_id,
          tabla_nombre,
          operacion,
          datos_antes,
          datos_despues,
          created_at
        FROM audit_log
        WHERE registro_id = $1
        ORDER BY created_at ASC`,
        [recordId]
      );

      return res.json({
        success: true,
        data: {
          historia: result.rows
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Error al recuperar historia'
      });
    }
  }
}

module.exports = AuditLogController;
