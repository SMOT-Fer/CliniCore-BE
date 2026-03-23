const db = require('../config/db');

class SuscripcionesModel {
  static async listarEventos({ empresaId = null, suscripcionId = null, limit = 100, offset = 0 } = {}) {
    const params = [];
    let where = 'WHERE 1=1';

    if (empresaId) {
      params.push(empresaId);
      where += ` AND se.clinica_id = $${params.length}`;
    }

    if (suscripcionId) {
      params.push(suscripcionId);
      where += ` AND se.suscripcion_id = $${params.length}`;
    }

    params.push(limit);
    const limitPos = params.length;
    params.push(offset);
    const offsetPos = params.length;

    const response = await db.query(
      `SELECT se.*
       FROM suscripcion_eventos se
       ${where}
       ORDER BY se.created_at DESC
       LIMIT $${limitPos}
       OFFSET $${offsetPos}`,
      params
    );

    return response.rows;
  }

  static async listarUsoMensual({ empresaId = null, periodo = null, limit = 100, offset = 0 } = {}) {
    const params = [];
    let where = 'WHERE 1=1';

    if (empresaId) {
      params.push(empresaId);
      where += ` AND upm.clinica_id = $${params.length}`;
    }

    if (periodo) {
      params.push(periodo);
      where += ` AND upm.periodo_yyyymm = $${params.length}`;
    }

    params.push(limit);
    const limitPos = params.length;
    params.push(offset);
    const offsetPos = params.length;

    const response = await db.query(
      `SELECT upm.*, e.nombre AS empresa_nombre
       FROM uso_plan_mensual upm
       JOIN clinicas e ON e.id = upm.clinica_id
       ${where}
       ORDER BY upm.periodo_yyyymm DESC, upm.updated_at DESC
       LIMIT $${limitPos}
       OFFSET $${offsetPos}`,
      params
    );

    return response.rows;
  }

  static async obtenerVigentePorEmpresa(empresaId) {
    const response = await db.query(
      `SELECT *
       FROM v_suscripcion_vigente
       WHERE clinica_id = $1
       ORDER BY periodo_actual_fin DESC
       LIMIT 1`,
      [empresaId]
    );

    return response.rows[0] || null;
  }

  static async listarVigentes() {
    const response = await db.query(
      `SELECT
         v.*,
         e.nombre AS empresa_nombre,
         e.ruc AS empresa_ruc
       FROM v_suscripcion_vigente v
       JOIN clinicas e ON e.id = v.clinica_id
       ORDER BY v.periodo_actual_fin ASC`
    );

    return response.rows;
  }

  static async listarHistorialPorEmpresa(empresaId) {
    const response = await db.query(
      `SELECT
         se.*,
         p.codigo AS plan_codigo,
         p.nombre AS plan_nombre,
         p.precio_mensual,
         p.precio_anual,
         p.moneda
       FROM suscripciones_clinica se
       JOIN planes_saas p ON p.id = se.plan_id
       WHERE se.clinica_id = $1
       ORDER BY se.created_at DESC`,
      [empresaId]
    );

    return response.rows;
  }

  static async crearSuscripcionTrialInicial(empresaId, createdBy = null) {
    const response = await db.query(
      `WITH trial_plan AS (
          SELECT id, COALESCE(dias_trial, 14) AS dias_trial
          FROM planes_saas
          WHERE codigo = 'TRIAL_CLINICA' AND estado = 'ACTIVO'
          LIMIT 1
        ), activa AS (
          SELECT 1
          FROM suscripciones_clinica
          WHERE clinica_id = $1
            AND estado IN ('TRIAL', 'ACTIVA', 'PAST_DUE')
            AND NOW() <= periodo_actual_fin
          LIMIT 1
        )
        INSERT INTO suscripciones_clinica (
          clinica_id,
          plan_id,
          estado,
          periodo_actual_inicio,
          periodo_actual_fin,
          trial_ends_at,
          created_by,
          updated_by
        )
        SELECT
          $1,
          tp.id,
          'TRIAL'::suscripcion_estado,
          NOW(),
          NOW() + make_interval(days => tp.dias_trial),
          NOW() + make_interval(days => tp.dias_trial),
          $2,
          $2
        FROM trial_plan tp
        WHERE NOT EXISTS (SELECT 1 FROM activa)
        RETURNING *`,
      [empresaId, createdBy]
    );

    if (response.rows[0]) {
      return response.rows[0];
    }

    return this.obtenerVigentePorEmpresa(empresaId);
  }

  static async asignarPlanEmpresa({
    empresaId,
    planId,
    estadoInicial = 'ACTIVA',
    duracionDias = 30,
    actorUserId = null
  }) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE suscripciones_clinica
         SET estado = 'CANCELADA',
             cancelled_at = NOW(),
             updated_at = NOW(),
             updated_by = $2
         WHERE clinica_id = $1
           AND estado IN ('TRIAL', 'ACTIVA', 'PAST_DUE')
           AND NOW() <= periodo_actual_fin`,
        [empresaId, actorUserId]
      );

      const inserted = await client.query(
        `INSERT INTO suscripciones_clinica (
           clinica_id,
           plan_id,
           estado,
           periodo_actual_inicio,
           periodo_actual_fin,
           trial_ends_at,
           created_by,
           updated_by
         )
         VALUES (
           $1,
           $2,
           $3::suscripcion_estado,
           NOW(),
           NOW() + make_interval(days => $4::int),
           CASE WHEN $3::suscripcion_estado = 'TRIAL' THEN NOW() + make_interval(days => $4::int) ELSE NULL END,
           $5,
           $5
         )
         RETURNING *`,
        [empresaId, planId, estadoInicial, duracionDias, actorUserId]
      );

      const nueva = inserted.rows[0];

      await client.query(
        `INSERT INTO suscripcion_eventos (
           suscripcion_id,
           clinica_id,
           evento,
           estado_anterior,
           estado_nuevo,
           metadata,
           created_by
         ) VALUES ($1, $2, 'PLAN_ASIGNADO', NULL, $3::suscripcion_estado, $4::jsonb, $5)`,
        [
          nueva.id,
          empresaId,
          estadoInicial,
          JSON.stringify({ plan_id: planId, duracion_dias: duracionDias }),
          actorUserId
        ]
      );

      await client.query('COMMIT');
      return nueva;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async contarUsuariosActivosPorEmpresa(empresaId) {
    const response = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM usuarios
       WHERE clinica_id = $1
         AND deleted_at IS NULL
         AND estado = 'ACTIVO'`,
      [empresaId]
    );

    return Number(response.rows[0]?.total || 0);
  }

  static async validarCupoUsuarios(empresaId) {
    const [suscripcion, usuariosActivos] = await Promise.all([
      this.obtenerVigentePorEmpresa(empresaId),
      this.contarUsuariosActivosPorEmpresa(empresaId)
    ]);

    if (!suscripcion) {
      return {
        permitido: false,
        razon: 'SIN_SUSCRIPCION',
        limite: 0,
        usados: usuariosActivos,
        suscripcion: null
      };
    }

    const limite = suscripcion.max_usuarios;
    if (limite === null || limite === undefined) {
      return {
        permitido: true,
        razon: 'ILIMITADO',
        limite: null,
        usados: usuariosActivos,
        suscripcion
      };
    }

    return {
      permitido: usuariosActivos < Number(limite),
      razon: usuariosActivos < Number(limite) ? 'OK' : 'LIMITE_ALCANZADO',
      limite: Number(limite),
      usados: usuariosActivos,
      suscripcion
    };
  }
}

module.exports = SuscripcionesModel;
