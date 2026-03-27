const { z } = require('zod');

const schemaApiKeyIdParam = z.string().min(1, 'ID debe ser válido');

const schemaEstadoApiKey = z.enum(['ACTIVA', 'REVOCADA', 'EXPIRADA']).default('ACTIVA');

const schemaScopes = z.array(z.enum(['READ', 'WRITE', 'DELETE', 'ADMIN']).default('READ')).min(1).default(['READ']);

const schemaCrearApiKey = z.object({
  nombre: z.string().min(1).max(255, 'Nombre máximo 255 caracteres'),
  scopes: schemaScopes.optional(),
}).strict();

const schemaActualizarApiKey = z.object({
  nombre: z.string().min(1).max(255).optional(),
  scopes: schemaScopes.optional(),
}).strict().refine(
  (data) => Object.keys(data).filter((k) => data[k] !== undefined).length > 0,
  { message: 'Al menos un campo debe ser actualizado' }
);

module.exports = {
  schemaApiKeyIdParam,
  schemaEstadoApiKey,
  schemaScopes,
  schemaCrearApiKey,
  schemaActualizarApiKey,
};
