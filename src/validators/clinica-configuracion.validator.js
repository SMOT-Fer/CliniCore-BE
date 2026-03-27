const { z } = require('zod');

const monedaSchema = z.string().trim().length(3, 'Moneda debe tener 3 caracteres').transform((v) => v.toUpperCase());

const schemaGuardarClinicaConfiguracion = z.object({
  clinica_id: z.string().uuid('clinica_id inválido').optional(),
  timezone: z.string().trim().min(2).max(80).optional(),
  locale: z.string().trim().min(2).max(20).optional(),
  moneda: monedaSchema.optional(),
  logo_url: z.string().trim().url('logo_url inválido').optional().or(z.literal('')).transform((v) => (v === '' ? undefined : v)),
  color_primario: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'color_primario debe ser hexadecimal (#RGB o #RRGGBB)')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  config: z.record(z.any()).optional()
});

module.exports = {
  schemaGuardarClinicaConfiguracion
};
