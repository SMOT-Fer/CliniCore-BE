const { z } = require('zod');

const schemaMfaChallengeIdParam = z.string().min(1, 'ID debe ser válido');

const schemaResponderDesafio = z.object({
  codigo: z.string().length(6, 'Código debe ser de 6 dígitos').regex(/^\d{6}$/),
}).strict();

module.exports = {
  schemaMfaChallengeIdParam,
  schemaResponderDesafio,
};
