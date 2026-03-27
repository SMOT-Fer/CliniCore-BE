const { z } = require('zod');

const schemaRecetaIdParam = z.string().min(1, 'ID debe ser válido');

const schemaEstadoReceta = z.enum(['ACTIVA', 'UTILIZADA', 'ANULADA', 'EXPIRADA']).default('ACTIVA');

const schemaCrearReceta = z.object({
  paciente_id: z.string().min(1, 'ID de paciente requerido'),
  doctor_id: z.string().min(1, 'ID de doctor requerido'),
  numero_receta: z.string().min(1).max(50, 'Número de receta máximo 50 caracteres'),
  instrucciones: z.string().max(1000).optional(),
  notas: z.string().max(1000).optional(),
}).strict();

const schemaActualizarReceta = z.object({
  estado: schemaEstadoReceta.optional(),
  instrucciones: z.string().max(1000).optional(),
  notas: z.string().max(1000).optional(),
}).strict().refine(
  (data) => Object.keys(data).filter((k) => data[k] !== undefined).length > 0,
  { message: 'Al menos un campo debe ser actualizado' }
);

module.exports = {
  schemaRecetaIdParam,
  schemaEstadoReceta,
  schemaCrearReceta,
  schemaActualizarReceta,
};
