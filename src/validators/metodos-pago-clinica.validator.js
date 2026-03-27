const { z } = require('zod');

const schemaMetodoIdParam = z.string().min(1, 'ID debe ser válido');

const schemaTipoMetodo = z.enum(['TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA', 'BILLETERA_DIGITAL']).default('TARJETA_CREDITO');

const schemaProveedor = z.enum(['STRIPE', 'SQUARE', 'MERCADOPAGO', 'MANUAL']).default('STRIPE');

const schemaEstadoMetodo = z.enum(['ACTIVO', 'INACTIVO', 'SUSPENDED']).default('ACTIVO');

const schemaCrearMetodo = z.object({
  tipo_metodo: schemaTipoMetodo,
  proveedor: schemaProveedor,
  configuracion: z.object({}).passthrough().optional(),
}).strict();

const schemaActualizarMetodo = z.object({
  estado: schemaEstadoMetodo.optional(),
  configuracion: z.object({}).passthrough().optional(),
}).strict().refine(
  (data) => Object.keys(data).filter((k) => data[k] !== undefined).length > 0,
  { message: 'Al menos un campo debe ser actualizado' }
);

module.exports = {
  schemaMetodoIdParam,
  schemaTipoMetodo,
  schemaProveedor,
  schemaEstadoMetodo,
  schemaCrearMetodo,
  schemaActualizarMetodo,
};
