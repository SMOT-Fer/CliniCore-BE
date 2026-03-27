const { z } = require('zod');

const schemaIntegracionIdParam = z.string({ required_error: 'ID de integración requerido' }).min(1, 'ID debe ser válido');

const schemaProvider = z.enum(['STRIPE', 'SQUARE', 'SUSCRIPTOR', 'ZAPIER', 'WEBHOOK'], {
  errorMap: () => ({ message: 'Proveedor no válido. Opciones: STRIPE, SQUARE, SUSCRIPTOR, ZAPIER, WEBHOOK' }),
});

const schemaEstadoIntegracion = z.enum(['ACTIVE', 'INACTIVE', 'ERROR']).default('ACTIVE');

const schemaConfiguration = z.object({}).strict().passthrough();

const schemaCrearIntegracion = z.object({
  provider: schemaProvider,
  configuration: schemaConfiguration,
  estado: schemaEstadoIntegracion.optional(),
}).strict().refine(
  (data) => Object.keys(data.configuration || {}).length > 0 || data.provider,
  { message: 'Configuración no puede estar vacía' }
);

const schemaActualizarIntegracion = z.object({
  provider: schemaProvider.optional(),
  configuration: schemaConfiguration.optional(),
  estado: schemaEstadoIntegracion.optional(),
  ultimo_error: z.string().optional(),
}).strict().refine(
  (data) => Object.keys(data).filter((k) => data[k] !== undefined).length > 0,
  { message: 'Al menos un campo debe ser actualizado' }
);

module.exports = {
  schemaIntegracionIdParam,
  schemaProvider,
  schemaEstadoIntegracion,
  schemaConfiguration,
  schemaCrearIntegracion,
  schemaActualizarIntegracion,
};
