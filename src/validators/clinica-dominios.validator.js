const { z } = require('zod');

const schemaDominio = z.string().trim().min(3).max(255);

const schemaCrearClinicaDominio = z.object({
  clinica_id: z.string().uuid('clinica_id inválido').optional(),
  dominio: schemaDominio,
  es_principal: z.boolean().optional(),
  verificado: z.boolean().optional(),
  token_verificacion: z.string().trim().max(255).optional(),
  verificado_at: z.string().datetime().optional()
});

const schemaActualizarClinicaDominio = z
  .object({
    dominio: schemaDominio.optional(),
    es_principal: z.boolean().optional(),
    verificado: z.boolean().optional(),
    token_verificacion: z.string().trim().max(255).optional(),
    verificado_at: z.string().datetime().optional().or(z.null())
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar'
  });

module.exports = {
  schemaCrearClinicaDominio,
  schemaActualizarClinicaDominio
};
