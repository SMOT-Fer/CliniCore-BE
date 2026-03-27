const db = require('../config/db');

class UsoPlanMensualModel {
  static async obtenerOCrear({ clinicaId, fecha = new Date() }) {
    const mesActual = new Date(fecha.getFullYear(), fecha.getMonth(), 1);

    let response = await db.query(
      `SELECT id, clinica_id, mes, usuarios_activos, pacientes_registrados,
              consultas_realizadas, recetas_emitidas, otros_eventos, created_at, updated_at
       FROM uso_plan_mensual
       WHERE clinica_id = $1 AND mes = $2`,
      [clinicaId, mesActual]
    );

    if (response.rows.length === 0) {
      response = await db.query(
        `INSERT INTO uso_plan_mensual 
         (clinica_id, mes, usuarios_activos, pacientes_registrados, 
          consultas_realizadas, recetas_emitidas, otros_eventos)
         VALUES ($1, $2, 0, 0, 0, 0, 0)
         RETURNING id, clinica_id, mes, usuarios_activos, pacientes_registrados,
                   consultas_realizadas, recetas_emitidas, otros_eventos,
                   created_at, updated_at`,
        [clinicaId, mesActual]
      );
    }

    return response.rows[0];
  }

  static async incrementarMetrica({ clinicaId, metrica, cantidad = 1 }) {
    const validMetricas = [
      'usuarios_activos',
      'pacientes_registrados',
      'consultas_realizadas',
      'recetas_emitidas',
      'otros_eventos',
    ];

    if (!validMetricas.includes(metrica)) {
      throw new Error(`Métrica no válida: ${metrica}`);
    }

    const mesActual = new Date();
    mesActual.setDate(1);
    mesActual.setHours(0, 0, 0, 0);

    const response = await db.query(
      `UPDATE uso_plan_mensual
       SET ${metrica} = ${metrica} + $1, updated_at = NOW()
       WHERE clinica_id = $2 AND mes = $3
       RETURNING id, clinica_id, mes, usuarios_activos, pacientes_registrados,
                 consultas_realizadas, recetas_emitidas, otros_eventos, updated_at`,
      [cantidad, clinicaId, mesActual]
    );

    return response.rows[0] || null;
  }

  static async listarPorClinica({ clinicaId, meses = 12 }) {
    const response = await db.query(
      `SELECT id, clinica_id, mes, usuarios_activos, pacientes_registrados,
              consultas_realizadas, recetas_emitidas, otros_eventos, created_at, updated_at
       FROM uso_plan_mensual
       WHERE clinica_id = $1
       ORDER BY mes DESC
       LIMIT $2`,
      [clinicaId, meses]
    );
    return response.rows;
  }

  static async obtenerResumenAnual({ clinicaId, ano = new Date().getFullYear() }) {
    const response = await db.query(
      `SELECT SUM(usuarios_activos) as total_usuarios,
              SUM(pacientes_registrados) as total_pacientes,
              SUM(consultas_realizadas) as total_consultas,
              SUM(recetas_emitidas) as total_recetas,
              SUM(otros_eventos) as total_otros
       FROM uso_plan_mensual
       WHERE clinica_id = $1 
         AND EXTRACT(YEAR FROM mes) = $2`,
      [clinicaId, ano]
    );
    return response.rows[0];
  }
}

module.exports = UsoPlanMensualModel;
