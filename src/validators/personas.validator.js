const { z } = require('zod');

const sexoSchema = z.enum(['MASCULINO', 'FEMENINO']);

const schemaCrearPersona = z.object({
  dni: z.string().trim().regex(/^\d{8}$/, 'DNI debe tener 8 dígitos'),
  nombres: z.string().trim().min(1, 'Nombres requeridos').max(120, 'Nombres demasiado largos'),
  apellido_paterno: z.string().trim().min(1, 'Apellido paterno requerido').max(80, 'Apellido paterno demasiado largo'),
  apellido_materno: z.string().trim().min(1, 'Apellido materno requerido').max(80, 'Apellido materno demasiado largo'),
  sexo: sexoSchema,
  fecha_nacimiento: z.string().date('Fecha de nacimiento inválida')
});

const schemaActualizarPersona = z.object({
  dni: z.string().trim().regex(/^\d{8}$/, 'DNI debe tener 8 dígitos').optional(),
  nombres: z.string().trim().min(1, 'Nombres requeridos').max(120, 'Nombres demasiado largos').optional(),
  apellido_paterno: z.string().trim().min(1, 'Apellido paterno requerido').max(80, 'Apellido paterno demasiado largo').optional(),
  apellido_materno: z.string().trim().min(1, 'Apellido materno requerido').max(80, 'Apellido materno demasiado largo').optional(),
  sexo: sexoSchema.optional(),
  fecha_nacimiento: z.string().date('Fecha de nacimiento inválida').optional()
}).refine((obj) => Object.keys(obj).length > 0, {
  message: 'Debe enviar al menos un campo para actualizar'
});

module.exports = {
  schemaCrearPersona,
  schemaActualizarPersona
};