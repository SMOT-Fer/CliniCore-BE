const RefreshTokensModel = require('../models/refresh_tokens.model');
const db = require('../config/db');

class AdminController {
  static async listarSesiones(req, res) {
    try {
      const sesiones = await RefreshTokensModel.listarActivos();
      res.json({ success: true, data: sesiones, count: sesiones.length });
    } catch (error) {
      console.error('Error al listar sesiones:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async revocarSesion(req, res) {
    try {
      const { id } = req.params;
      const revocada = await RefreshTokensModel.revocarPorId(id);

      if (!revocada) {
        return res.status(404).json({ success: false, error: 'Sesión no encontrada' });
      }

      res.json({ success: true, data: revocada });
    } catch (error) {
      console.error('Error al revocar sesión:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async revocarSesionesPorUsuario(req, res) {
    try {
      const { id } = req.params;
      const revocadas = await RefreshTokensModel.revocarActivosPorUsuario(id);
      res.json({ success: true, count: revocadas.length, data: revocadas });
    } catch (error) {
      console.error('Error al revocar sesiones por usuario:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async estadoSistema(req, res) {
    try {
      const responseActividad = await db.query(
        `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS dia,
                COUNT(*)::int AS total
         FROM refresh_tokens
         WHERE created_at >= date_trunc('day', NOW()) - INTERVAL '6 day'
         GROUP BY 1
         ORDER BY 1 ASC`
      );

      const actividadMap = new Map(responseActividad.rows.map((row) => [row.dia, row.total]));
      const actividad7dias = [];

      for (let offset = 6; offset >= 0; offset -= 1) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - offset);

        const key = date.toISOString().slice(0, 10);
        const etiqueta = date.toLocaleDateString('es-PE', { weekday: 'short' });

        actividad7dias.push({
          dia: key,
          etiqueta,
          total: actividadMap.get(key) || 0
        });
      }

      const seguridad = [
        { nombre: 'Autenticación JWT', valor: 'ACTIVA' },
        { nombre: 'Refresh tokens rotativos', valor: 'ACTIVO' },
        { nombre: 'Protección CSRF', valor: 'ACTIVA' },
        { nombre: 'Control por roles', valor: 'ACTIVO' },
        { nombre: 'Cookies seguras en producción', valor: process.env.NODE_ENV === 'production' ? 'ACTIVO' : 'DESARROLLO' }
      ];

      const configuracion = [
        { nombre: 'Entorno', valor: process.env.NODE_ENV || 'development' },
        { nombre: 'Expiración access token', valor: process.env.JWT_ACCESS_EXPIRES_IN || '15m' },
        { nombre: 'Expiración refresh token', valor: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
        { nombre: 'Inactividad máxima sesión', valor: `${process.env.SESSION_IDLE_MINUTES || 60} min` },
        { nombre: 'Zona horaria servidor', valor: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }
      ];

      res.json({
        success: true,
        data: {
          seguridad,
          configuracion,
          actividad7dias
        }
      });
    } catch (error) {
      console.error('Error al obtener estado del sistema:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = AdminController;
