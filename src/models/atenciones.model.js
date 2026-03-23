const db = require('../config/db');

class AtencionesModel {
  static async listar({ clinicaId, pacienteId = null, profesionalId = null, from = null, to = null, estado = null, limit = 100, offset = 0 }) {
    const params = [clinicaId];
    let where = 'WHERE a.clinica_id = $1';

    if (pacienteId) {
      params.push(pacienteId);
      where += ` AND a.paciente_id = $${params.length}`;
    }
    if (profesionalId) {
      params.push(profesionalId);
      where += ` AND a.profesional_id = $${params.length}`;
    }
    if (from) {
      params.push(from);
      where += ` AND a.fecha_atencion >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      where += ` AND a.fecha_atencion <= $${params.length}`;
    }
    if (estado) {
      params.push(estado);
      where += ` AND a.estado = $${params.length}`;
    }

    params.push(limit);
    const limitPos = params.length;
    params.push(offset);
    const offsetPos = params.length;

    const response = await db.query(
      `SELECT
         a.*,
         hc.numero_historia,
         p.codigo_paciente,
         per.nombres,
         per.apellido_paterno,
         per.apellido_materno
       FROM atenciones_clinicas a
       JOIN historias_clinicas hc ON hc.id = a.historia_clinica_id
       JOIN pacientes p ON p.id = a.paciente_id
       JOIN personas per ON per.id = p.persona_id
       ${where}
       ORDER BY a.fecha_atencion DESC
       LIMIT $${limitPos}
       OFFSET $${offsetPos}`,
      params
    );

    return response.rows;
  }

  static async obtenerPorId({ id, clinicaId }) {
    const response = await db.query(
      `SELECT *
       FROM atenciones_clinicas
       WHERE id = $1 AND clinica_id = $2
       LIMIT 1`,
      [id, clinicaId]
    );

    return response.rows[0] || null;
  }

  static async obtenerDetalle({ id, clinicaId }) {
    const atencion = await this.obtenerPorId({ id, clinicaId });
    if (!atencion) return null;

    const [signos, diagnosticos, receta, archivos] = await Promise.all([
      db.query('SELECT * FROM atencion_signos_vitales WHERE atencion_id = $1 ORDER BY created_at DESC', [id]),
      db.query(
        `SELECT ad.*, d.codigo AS cie10_codigo, d.descripcion AS cie10_descripcion
         FROM atencion_diagnosticos ad
         JOIN diagnosticos_cie10 d ON d.id = ad.diagnostico_id
         WHERE ad.atencion_id = $1
         ORDER BY ad.es_principal DESC, ad.created_at ASC`,
        [id]
      ),
      db.query(
        `SELECT r.*,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', ri.id,
                      'medicamento', ri.medicamento,
                      'concentracion', ri.concentracion,
                      'forma_farmaceutica', ri.forma_farmaceutica,
                      'dosis', ri.dosis,
                      'frecuencia', ri.frecuencia,
                      'duracion', ri.duracion,
                      'via_administracion', ri.via_administracion,
                      'cantidad', ri.cantidad,
                      'indicaciones', ri.indicaciones
                    )
                  ) FILTER (WHERE ri.id IS NOT NULL),
                  '[]'::json
                ) AS items
         FROM recetas_medicas r
         LEFT JOIN receta_items ri ON ri.receta_id = r.id
         WHERE r.atencion_id = $1
         GROUP BY r.id
         ORDER BY r.emitida_at DESC
         LIMIT 1`,
        [id]
      ),
      db.query('SELECT * FROM archivos_clinicos WHERE atencion_id = $1 ORDER BY created_at DESC', [id])
    ]);

    return {
      ...atencion,
      signos_vitales: signos.rows,
      diagnosticos: diagnosticos.rows,
      receta: receta.rows[0] || null,
      archivos: archivos.rows
    };
  }

  static async crear({ clinicaId, payload, actorUserId }) {
    const response = await db.query(
      `INSERT INTO atenciones_clinicas (
         clinica_id,
         historia_clinica_id,
         cita_id,
         paciente_id,
         profesional_id,
         especialidad_id,
         estado,
         fecha_atencion,
         motivo_consulta,
         anamnesis,
         examen_fisico,
         evaluacion,
         plan_tratamiento,
         recomendaciones,
         proxima_cita_sugerida_at,
         created_by
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        clinicaId,
        payload.historia_clinica_id,
        payload.cita_id || null,
        payload.paciente_id,
        payload.profesional_id,
        payload.especialidad_id || null,
        payload.estado || 'ABIERTA',
        payload.fecha_atencion || new Date().toISOString(),
        payload.motivo_consulta || null,
        payload.anamnesis || null,
        payload.examen_fisico || null,
        payload.evaluacion || null,
        payload.plan_tratamiento || null,
        payload.recomendaciones || null,
        payload.proxima_cita_sugerida_at || null,
        actorUserId || null
      ]
    );

    return response.rows[0];
  }

  static async actualizar({ id, clinicaId, payload }) {
    const fields = {
      estado: payload.estado,
      fecha_atencion: payload.fecha_atencion,
      motivo_consulta: payload.motivo_consulta,
      anamnesis: payload.anamnesis,
      examen_fisico: payload.examen_fisico,
      evaluacion: payload.evaluacion,
      plan_tratamiento: payload.plan_tratamiento,
      recomendaciones: payload.recomendaciones,
      proxima_cita_sugerida_at: payload.proxima_cita_sugerida_at,
      firmado_por: payload.firmado_por,
      firmado_at: payload.firmado_at
    };

    const entries = Object.entries(fields).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) return null;

    const setClause = entries.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values = entries.map(([_, v]) => v);
    values.push(id);
    values.push(clinicaId);

    const response = await db.query(
      `UPDATE atenciones_clinicas
       SET ${setClause}, updated_at = NOW()
       WHERE id = $${values.length - 1}
         AND clinica_id = $${values.length}
       RETURNING *`,
      values
    );

    return response.rows[0] || null;
  }

  static async agregarSignos({ atencionId, payload }) {
    const response = await db.query(
      `INSERT INTO atencion_signos_vitales (
         atencion_id,
         presion_arterial,
         frecuencia_cardiaca,
         frecuencia_respiratoria,
         temperatura,
         saturacion_oxigeno,
         peso_kg,
         talla_cm,
         imc,
         glucosa_mg_dl,
         observaciones
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        atencionId,
        payload.presion_arterial || null,
        payload.frecuencia_cardiaca || null,
        payload.frecuencia_respiratoria || null,
        payload.temperatura || null,
        payload.saturacion_oxigeno || null,
        payload.peso_kg || null,
        payload.talla_cm || null,
        payload.imc || null,
        payload.glucosa_mg_dl || null,
        payload.observaciones || null
      ]
    );

    return response.rows[0];
  }

  static async agregarDiagnosticos({ atencionId, diagnosticos = [] }) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');
      const inserted = [];

      for (const d of diagnosticos) {
        const row = await client.query(
          `INSERT INTO atencion_diagnosticos (
             atencion_id,
             diagnostico_id,
             es_principal,
             tipo,
             notas
           ) VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (atencion_id, diagnostico_id)
           DO UPDATE SET
             es_principal = EXCLUDED.es_principal,
             tipo = EXCLUDED.tipo,
             notas = EXCLUDED.notas
           RETURNING *`,
          [atencionId, d.diagnostico_id, Boolean(d.es_principal), d.tipo || null, d.notas || null]
        );
        inserted.push(row.rows[0]);
      }

      await client.query('COMMIT');
      return inserted;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async crearReceta({ clinicaId, atencionId, payload, actorUserId }) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const recetaRes = await client.query(
        `INSERT INTO recetas_medicas (
           clinica_id,
           atencion_id,
           paciente_id,
           profesional_id,
           codigo,
           indicaciones_generales,
           emitida_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [
          clinicaId,
          atencionId,
          payload.paciente_id,
          payload.profesional_id || actorUserId || null,
          payload.codigo || null,
          payload.indicaciones_generales || null,
          payload.emitida_at || new Date().toISOString()
        ]
      );

      const receta = recetaRes.rows[0];
      const items = payload.items || [];

      for (const item of items) {
        await client.query(
          `INSERT INTO receta_items (
             receta_id,
             medicamento,
             concentracion,
             forma_farmaceutica,
             dosis,
             frecuencia,
             duracion,
             via_administracion,
             cantidad,
             indicaciones
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            receta.id,
            item.medicamento,
            item.concentracion || null,
            item.forma_farmaceutica || null,
            item.dosis || null,
            item.frecuencia || null,
            item.duracion || null,
            item.via_administracion || null,
            item.cantidad || null,
            item.indicaciones || null
          ]
        );
      }

      await client.query('COMMIT');
      return receta;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = AtencionesModel;
