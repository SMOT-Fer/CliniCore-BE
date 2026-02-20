const { z } = require('zod');

const schemaIdParam = z.object({
  id: z.string().uuid('ID inválido')
});

const schemaDniParam = z.object({
  dni: z.string().regex(/^\d{8}$/, 'DNI inválido')
});

module.exports = {
  schemaIdParam,
  schemaDniParam
};