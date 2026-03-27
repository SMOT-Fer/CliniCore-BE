const { z } = require('zod');

const schemaPagoIdParam = z.string({ required_error: 'ID de pago requerido' }).min(1, 'ID debe ser válido');

const schemaEstadoPago = z.enum(['PENDIENTE', 'EN_REINTENTO', 'COMPLETADO', 'RECHAZADO', 'CANCELADO'], {
  errorMap: () => ({ message: 'Estado no válido. Opciones: PENDIENTE, EN_REINTENTO, COMPLETADO, RECHAZADO, CANCELADO' }),
});

const schemaProveedorPago = z.enum(['STRIPE', 'SQUARE', 'MERCADOPAGO', 'MANUAL']).default('STRIPE');

const schemaMetodoPago = z.enum(['TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA', 'OTRO']).default('TARJETA_CREDITO');

const schemaMoneda = z.enum(['PEN', 'USD', 'EUR', 'MXN']).default('PEN');

const schemaCrearPago = z.object({
  factura_id: z.string().min(1, 'ID de factura requerido'),
  monto: z.number().positive('Monto debe ser mayor a 0'),
  moneda: schemaMoneda.optional(),
  proveedor_pago: schemaProveedorPago,
  metodo_pago: schemaMetodoPago,
  referencia_externa: z.string().min(1).max(255).optional(),
  detalles: z.object({}).passthrough().optional(),
}).strict();

const schemaActualizarPago = z.object({
  estado: schemaEstadoPago.optional(),
  error_mensaje: z.string().max(500).optional(),
  numero_intentos: z.number().nonnegative().optional(),
  detalles: z.object({}).passthrough().optional(),
}).strict().refine(
  (data) => Object.keys(data).filter((k) => data[k] !== undefined).length > 0,
  { message: 'Al menos un campo debe ser actualizado' }
);

const schemaMarcarCompletado = z.object({
  referencia_transaccion: z.string().min(1).max(255).optional(),
}).strict();

const schemaMarcarRechazado = z.object({
  motivo: z.string().min(1).max(500),
}).strict();

module.exports = {
  schemaPagoIdParam,
  schemaEstadoPago,
  schemaProveedorPago,
  schemaMetodoPago,
  schemaMoneda,
  schemaCrearPago,
  schemaActualizarPago,
  schemaMarcarCompletado,
  schemaMarcarRechazado,
};
