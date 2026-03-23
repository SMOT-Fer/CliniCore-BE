const { z } = require('zod');

const atencionEstado = z.enum(['ABIERTA', 'CERRADA', 'ANULADA']);

const schemaCrearAtencion = z.object({
  clinica_id: z.string().uuid('clinica_id invalido').optional(),
  historia_clinica_id: z.string().uuid('historia_clinica_id invalido'),
  cita_id: z.string().uuid('cita_id invalido').optional(),
  paciente_id: z.string().uuid('paciente_id invalido'),
  profesional_id: z.string().uuid('profesional_id invalido'),
  especialidad_id: z.string().uuid('especialidad_id invalido').optional(),
  estado: atencionEstado.optional(),
  fecha_atencion: z.string().datetime('fecha_atencion invalida').optional(),
  motivo_consulta: z.string().trim().max(3000).optional(),
  anamnesis: z.string().trim().max(12000).optional(),
  examen_fisico: z.string().trim().max(12000).optional(),
  evaluacion: z.string().trim().max(12000).optional(),
  plan_tratamiento: z.string().trim().max(12000).optional(),
  recomendaciones: z.string().trim().max(12000).optional(),
  proxima_cita_sugerida_at: z.string().datetime('proxima_cita_sugerida_at invalida').optional()
});

const schemaActualizarAtencion = z.object({
  estado: atencionEstado.optional(),
  fecha_atencion: z.string().datetime('fecha_atencion invalida').optional(),
  motivo_consulta: z.string().trim().max(3000).optional(),
  anamnesis: z.string().trim().max(12000).optional(),
  examen_fisico: z.string().trim().max(12000).optional(),
  evaluacion: z.string().trim().max(12000).optional(),
  plan_tratamiento: z.string().trim().max(12000).optional(),
  recomendaciones: z.string().trim().max(12000).optional(),
  proxima_cita_sugerida_at: z.string().datetime('proxima_cita_sugerida_at invalida').nullable().optional(),
  firmado_por: z.string().uuid('firmado_por invalido').nullable().optional(),
  firmado_at: z.string().datetime('firmado_at invalida').nullable().optional()
}).refine((obj) => Object.keys(obj).length > 0, {
  message: 'Debe enviar al menos un campo para actualizar'
});

const schemaSignos = z.object({
  presion_arterial: z.string().trim().max(30).optional(),
  frecuencia_cardiaca: z.number().int().positive().optional(),
  frecuencia_respiratoria: z.number().int().positive().optional(),
  temperatura: z.number().positive().optional(),
  saturacion_oxigeno: z.number().min(0).max(100).optional(),
  peso_kg: z.number().positive().optional(),
  talla_cm: z.number().positive().optional(),
  imc: z.number().positive().optional(),
  glucosa_mg_dl: z.number().positive().optional(),
  observaciones: z.string().trim().max(2000).optional()
});

const schemaDiagnosticos = z.object({
  diagnosticos: z.array(
    z.object({
      diagnostico_id: z.string().uuid('diagnostico_id invalido'),
      es_principal: z.boolean().optional(),
      tipo: z.string().trim().max(80).optional(),
      notas: z.string().trim().max(2000).optional()
    })
  ).min(1, 'Debe enviar al menos un diagnostico')
});

const schemaReceta = z.object({
  paciente_id: z.string().uuid('paciente_id invalido'),
  profesional_id: z.string().uuid('profesional_id invalido').optional(),
  codigo: z.string().trim().max(60).optional(),
  indicaciones_generales: z.string().trim().max(3000).optional(),
  emitida_at: z.string().datetime('emitida_at invalida').optional(),
  items: z.array(
    z.object({
      medicamento: z.string().trim().min(1).max(255),
      concentracion: z.string().trim().max(120).optional(),
      forma_farmaceutica: z.string().trim().max(120).optional(),
      dosis: z.string().trim().max(120).optional(),
      frecuencia: z.string().trim().max(120).optional(),
      duracion: z.string().trim().max(120).optional(),
      via_administracion: z.string().trim().max(120).optional(),
      cantidad: z.number().int().positive().optional(),
      indicaciones: z.string().trim().max(2000).optional()
    })
  ).min(1, 'Debe enviar al menos un item de receta')
});

module.exports = {
  schemaCrearAtencion,
  schemaActualizarAtencion,
  schemaSignos,
  schemaDiagnosticos,
  schemaReceta
};
