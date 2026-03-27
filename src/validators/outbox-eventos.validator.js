const { z } = require('zod');

const schemaEntidad = z.enum([
  'CLINICA',
  'USUARIO',
  'PACIENTE',
  'FACTURA',
  'PAGO',
  'RECETA',
  'CITA',
  'ATENCION',
]).default('CLINICA');

const schemaTipoEvento = z.enum([
  'CREADO',
  'ACTUALIZADO',
  'ELIMINADO',
  'VALIDADO',
  'PAGADO',
  'CANCELADO',
  'RECHAZADO',
]).default('CREADO');

const schemaCrearEvento = z.object({
  entidad: schemaEntidad,
  tipo_evento: schemaTipoEvento,
  entidad_id: z.string().min(1),
  datos: z.object({}).passthrough().optional(),
}).strict();

module.exports = {
  schemaEntidad,
  schemaTipoEvento,
  schemaCrearEvento,
};
