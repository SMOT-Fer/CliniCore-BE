const { z } = require('zod');

const schemaFacturaIdParam = z.string({ required_error: 'ID de factura requerido' }).min(1, 'ID debe ser válido');

const schemaEstadoFactura = z.enum(['BORRADOR', 'EMITIDA', 'PAGADA', 'CANCELADA'], {
  errorMap: () => ({ message: 'Estado no válido. Opciones: BORRADOR, EMITIDA, PAGADA, CANCELADA' }),
});

const schemaMoneda = z.enum(['PEN', 'USD', 'EUR', 'MXN']).default('PEN');

const schemaDetalleFactura = z.object({
  descripcion: z.string().min(1),
  cantidad: z.number().positive(),
  precio_unitario: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
}).strict();

const schemaCrearFactura = z.object({
  numero_factura: z.string().min(1, 'Número de factura requerido').max(50),
  monto_total: z.number().positive('Monto debe ser mayor a 0'),
  moneda: schemaMoneda.optional(),
  periodo_inicio: z.coerce.date(),
  periodo_fin: z.coerce.date(),
  nombre_cliente: z.string().min(1).max(255),
  email_cliente: z.string().email('Email inválido'),
  detalles: z.array(schemaDetalleFactura).min(1, 'Al menos un detalle requerido').optional(),
  notas: z.string().max(1000).optional(),
}).strict().refine(
  (data) => data.periodo_fin >= data.periodo_inicio,
  { message: 'Fecha fin debe ser posterior a fecha inicio', path: ['periodo_fin'] }
);

const schemaActualizarFactura = z.object({
  estado: schemaEstadoFactura.optional(),
  monto_total: z.number().positive().optional(),
  detalles: z.array(schemaDetalleFactura).optional(),
  notas: z.string().max(1000).optional(),
}).strict().refine(
  (data) => Object.keys(data).filter((k) => data[k] !== undefined).length > 0,
  { message: 'Al menos un campo debe ser actualizado' }
);

const schemaCambiarEstado = z.object({
  nuevo_estado: schemaEstadoFactura,
}).strict();

module.exports = {
  schemaFacturaIdParam,
  schemaEstadoFactura,
  schemaMoneda,
  schemaDetalleFactura,
  schemaCrearFactura,
  schemaActualizarFactura,
  schemaCambiarEstado,
};
