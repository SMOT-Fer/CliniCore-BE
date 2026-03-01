const RefreshTokensModel = require('../models/refresh_tokens.model');
const db = require('../config/db');

const ADMIN_CACHE_TTL_MS = 60 * 1000;
const adminCache = new Map();

function getCached(key) {
  const entry = adminCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    adminCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value, ttlMs = ADMIN_CACHE_TTL_MS) {
  adminCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

function invalidateCacheByPrefix(prefixes = []) {
  for (const key of adminCache.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      adminCache.delete(key);
    }
  }
}

class AdminController {
  static async listarSesiones(req, res) {
    try {
      const cacheKey = 'sesiones:listar';
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const sesiones = await RefreshTokensModel.listarActivos();
      const payload = { success: true, data: sesiones, count: sesiones.length };
      setCached(cacheKey, payload);
      res.json(payload);
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

      invalidateCacheByPrefix(['sesiones:', 'dashboard:']);

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
      invalidateCacheByPrefix(['sesiones:', 'dashboard:']);
      res.json({ success: true, count: revocadas.length, data: revocadas });
    } catch (error) {
      console.error('Error al revocar sesiones por usuario:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async resumenDashboard(req, res) {
    try {
      const endDateRaw = typeof req.query?.endDate === 'string' ? req.query.endDate : null;
      const endDateParsed = endDateRaw ? new Date(`${endDateRaw}T00:00:00`) : new Date();
      const endDate = Number.isNaN(endDateParsed.getTime()) ? new Date() : endDateParsed;
      endDate.setHours(0, 0, 0, 0);

      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);

      const startDateKey = startDate.toISOString().slice(0, 10);
      const endDateKey = endDate.toISOString().slice(0, 10);
      const cacheKey = `dashboard:summary:${endDateKey}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const [
        clinicasStats,
        clinicasActivasNombres,
        usuariosStats,
        usuariosActivosNombres,
        sesionesStats,
        actividadRows
      ] = await Promise.all([
        db.query(
          `SELECT COUNT(*) FILTER (WHERE deleted_at IS NULL)::int AS total,
                  COUNT(*) FILTER (WHERE deleted_at IS NULL AND estado = 'ACTIVA')::int AS activas
           FROM empresas`
        ),
        db.query(
          `SELECT nombre
           FROM empresas
           WHERE deleted_at IS NULL
             AND estado = 'ACTIVA'
           ORDER BY created_at DESC
           LIMIT 50`
        ),
        db.query(
          `SELECT COUNT(*) FILTER (WHERE deleted_at IS NULL)::int AS total,
                  COUNT(*) FILTER (WHERE deleted_at IS NULL AND estado = 'ACTIVO')::int AS activos
           FROM usuarios`
        ),
        db.query(
          `SELECT email
           FROM usuarios
           WHERE deleted_at IS NULL AND estado = 'ACTIVO'
           ORDER BY created_at DESC
           LIMIT 50`
        ),
        db.query(
          `SELECT COUNT(*)::int AS activas
           FROM refresh_tokens
           WHERE revoked_at IS NULL AND expires_at > NOW()`
        ),
        db.query(
          `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS dia,
                  COUNT(*)::int AS total
           FROM refresh_tokens
           WHERE created_at >= $1::date
             AND created_at < ($2::date + INTERVAL '1 day')
           GROUP BY 1
           ORDER BY 1 ASC`,
          [startDateKey, endDateKey]
        )
      ]);

      const clinicasRow = clinicasStats.rows[0] || { total: 0, activas: 0 };
      const usuariosRow = usuariosStats.rows[0] || { total: 0, activos: 0 };
      const sesionesRow = sesionesStats.rows[0] || { activas: 0 };

      const actividadMap = new Map(actividadRows.rows.map((row) => [row.dia, row.total]));
      const actividad7dias = [];

      for (let offset = 0; offset < 7; offset += 1) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + offset);

        const key = date.toISOString().slice(0, 10);
        const etiqueta = date.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '').toUpperCase();

        actividad7dias.push({
          dia: key,
          etiqueta,
          total: actividadMap.get(key) || 0
        });
      }

      const payload = {
        success: true,
        data: {
          clinicasTotal: Number(clinicasRow.total || 0),
          clinicasActivas: Number(clinicasRow.activas || 0),
          clinicasActivasNombres: clinicasActivasNombres.rows.map((row) => row.nombre || 'Sin nombre'),
          usuariosTotal: Number(usuariosRow.total || 0),
          usuariosActivos: Number(usuariosRow.activos || 0),
          usuariosActivosNombres: usuariosActivosNombres.rows.map((row) => row.email || 'Sin email'),
          sesionesActivas: Number(sesionesRow.activas || 0),
          actividad7dias,
          seguridad: [
            { nombre: 'Autenticación JWT', valor: 'ACTIVA' },
            { nombre: 'Refresh tokens rotativos', valor: 'ACTIVO' },
            { nombre: 'Protección CSRF', valor: 'ACTIVA' },
            { nombre: 'Control por roles', valor: 'ACTIVO' },
            { nombre: 'Cookies seguras en producción', valor: process.env.NODE_ENV === 'production' ? 'ACTIVO' : 'DESARROLLO' }
          ],
          rango: {
            inicio: startDateKey,
            fin: endDateKey
          }
        }
      };

      setCached(cacheKey, payload);
      res.json(payload);
    } catch (error) {
      console.error('Error al obtener resumen del dashboard:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async estadoSistema(req, res) {
    try {
      const endDateRaw = typeof req.query?.endDate === 'string' ? req.query.endDate : null;
      const endDateParsed = endDateRaw ? new Date(`${endDateRaw}T00:00:00`) : new Date();
      const endDate = Number.isNaN(endDateParsed.getTime()) ? new Date() : endDateParsed;
      endDate.setHours(0, 0, 0, 0);

      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);

      const startDateKey = startDate.toISOString().slice(0, 10);
      const endDateKey = endDate.toISOString().slice(0, 10);
      const cacheKey = `dashboard:system-status:${endDateKey}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const responseActividad = await db.query(
        `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS dia,
                COUNT(*)::int AS total
         FROM refresh_tokens
         WHERE created_at >= $1::date
           AND created_at < ($2::date + INTERVAL '1 day')
         GROUP BY 1
         ORDER BY 1 ASC`,
        [startDateKey, endDateKey]
      );

      const actividadMap = new Map(responseActividad.rows.map((row) => [row.dia, row.total]));
      const actividad7dias = [];

      for (let offset = 0; offset < 7; offset += 1) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + offset);

        const key = date.toISOString().slice(0, 10);
        const etiqueta = date.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '').toUpperCase();

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

      const payload = {
        success: true,
        data: {
          seguridad,
          configuracion,
          actividad7dias,
          rango: {
            inicio: startDateKey,
            fin: endDateKey
          }
        }
      };

      setCached(cacheKey, payload);
      res.json(payload);
    } catch (error) {
      console.error('Error al obtener estado del sistema:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = AdminController;
