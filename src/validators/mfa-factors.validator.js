const { z } = require('zod');

const schemaMfaFactorIdParam = z.string().min(1, 'ID debe ser válido');

const schemaTipoFactor = z.enum(['TOTP', 'SMS', 'EMAIL', 'BACKUP_CODES'], {
  errorMap: () => ({ message: 'Tipo de factor no válido. Opciones: TOTP, SMS, EMAIL, BACKUP_CODES' }),
});

const schemaEstadoMfaFactor = z.enum(['ACTIVO', 'INACTIVO']).default('ACTIVO');

const schemaCrearMfaFactor = z.object({
  tipo_factor: schemaTipoFactor,
  secreto_verificacion: z.string().min(1, 'Secreto requerido'),
  codigo_backup: z.array(z.string()).optional(),
}).strict();

const schemaVerificarMfaFactor = z.object({
  codigo: z.string().length(6, 'Código debe ser de 6 dígitos').regex(/^\d{6}$/),
}).strict();

const schemaDesactivarMfaFactor = z.object({
  contrasena: z.string().min(1, 'Contraseña requerida para confirmar'),
}).strict();

module.exports = {
  schemaMfaFactorIdParam,
  schemaTipoFactor,
  schemaEstadoMfaFactor,
  schemaCrearMfaFactor,
  schemaVerificarMfaFactor,
  schemaDesactivarMfaFactor,
};
