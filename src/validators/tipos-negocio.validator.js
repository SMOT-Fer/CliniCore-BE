const { z } = require('zod');

const schemaCrearTipoNegocio = z.object({
  codigo: z.string().trim().min(2, 'Codigo debe tener al menos 2 caracteres').max(50, 'Codigo demasiado largo'),
  nombre: z.string().trim().min(2, 'Nombre debe tener al menos 2 caracteres').max(120, 'Nombre demasiado largo')
});

const schemaActualizarTipoNegocio = z
  .object({
    codigo: z.string().trim().min(2, 'Codigo debe tener al menos 2 caracteres').max(50, 'Codigo demasiado largo').optional(),
    nombre: z.string().trim().min(2, 'Nombre debe tener al menos 2 caracteres').max(120, 'Nombre demasiado largo').optional()
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar'
  });

module.exports = {
  schemaCrearTipoNegocio,
  schemaActualizarTipoNegocio
};
