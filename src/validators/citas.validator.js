const { z } = require('zod');

const citaEstado = z.enum(['PROGRAMADA', 'CONFIRMADA', 'EN_CURSO', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO', 'REPROGRAMADA']);
const citaCanal = z.enum(['PRESENCIAL', 'VIRTUAL', 'DOMICILIO']);

const schemaCrearCita = z.object({
  clinica_id: z.string().uuid('clinica_id invalido').optional(),
  paciente_id: z.string().uuid('paciente_id invalido'),
  profesional_id: z.string().uuid('profesional_id invalido'),
  especialidad_id: z.string().uuid('especialidad_id invalido').optional(),
  estado: citaEstado.optional(),
  canal: citaCanal.optional(),
  fecha_inicio: z.string().datetime('fecha_inicio invalida'),
  fecha_fin: z.string().datetime('fecha_fin invalida'),
  motivo: z.string().trim().max(2000).optional(),
  observaciones: z.string().trim().max(2000).optional(),
  sala_consultorio: z.string().trim().max(120).optional(),
  origen: z.string().trim().max(80).optional()
});

const schemaActualizarCita = z.object({
  paciente_id: z.string().uuid('paciente_id invalido').optional(),
  profesional_id: z.string().uuid('profesional_id invalido').optional(),
  especialidad_id: z.string().uuid('especialidad_id invalido').nullable().optional(),
  estado: citaEstado.optional(),
  canal: citaCanal.optional(),
  fecha_inicio: z.string().datetime('fecha_inicio invalida').optional(),
  fecha_fin: z.string().datetime('fecha_fin invalida').optional(),
  motivo: z.string().trim().max(2000).optional(),
  observaciones: z.string().trim().max(2000).optional(),
  sala_consultorio: z.string().trim().max(120).optional(),
  origen: z.string().trim().max(80).optional(),
  confirmada_at: z.string().datetime('confirmada_at invalida').nullable().optional(),
  cancelada_at: z.string().datetime('cancelada_at invalida').nullable().optional(),
  cancelada_por: z.string().uuid('cancelada_por invalido').nullable().optional(),
  cancelacion_motivo: z.string().trim().max(1000).optional()
}).refine((obj) => Object.keys(obj).length > 0, {
  message: 'Debe enviar al menos un campo para actualizar'
});

module.exports = {
  schemaCrearCita,
  schemaActualizarCita
};
