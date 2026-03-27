const { z } = require('zod');

const schemaWebhookEventoIdParam = z.string().min(1, 'ID debe ser válido');

const schemaProveedor = z.enum(['STRIPE', 'SQUARE', 'MERCADOPAGO', 'PAYPAL']).default('STRIPE');

const schemaEstadoProcesamiento = z.enum(['PENDIENTE', 'PROCESADO', 'ERROR', 'DUPLICADO']);

const schemaTipoPago = z.enum([
  'payment.succeeded',
  'payment.failed',
  'charge.completed',
  'charge.failed',
  'charge.refunded',
  'invoice.paid',
  'invoice.payment_failed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
]);

const schemaCrearWebhookEvento = z.object({
  proveedor: schemaProveedor,
  evento_tipo: schemaTipoPago,
  referencia_externa: z.string().min(1).max(255),
  payload_evento: z.object({}).passthrough().optional(),
}).strict();

const schemaActualizarWebhookEvento = z.object({
  estado_procesamiento: schemaEstadoProcesamiento.optional(),
  error_procesamiento: z.string().max(1000).optional(),
}).strict().refine(
  (data) => Object.keys(data).filter((k) => data[k] !== undefined).length > 0,
  { message: 'Al menos un campo debe ser actualizado' }
);

module.exports = {
  schemaWebhookEventoIdParam,
  schemaProveedor,
  schemaEstadoProcesamiento,
  schemaTipoPago,
  schemaCrearWebhookEvento,
  schemaActualizarWebhookEvento,
};
