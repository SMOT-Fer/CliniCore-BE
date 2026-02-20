const { z } = require('zod');

const emptyToUndefined = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const schemaCrearClinica = z.object({
  nombre: z.string().trim().min(1, 'Nombre de clínica requerido').max(150, 'Nombre demasiado largo'),
  ruc: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^\d{11}$/, 'RUC debe tener 11 dígitos').optional()
  ),
  estado: z.enum(['ACTIVA', 'INACTIVA']).optional(),
  direccion: z.preprocess(
    emptyToUndefined,
    z.string().max(255, 'Dirección demasiado larga').optional()
  ),
  telefono: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^\d{6,20}$/, 'Teléfono debe contener solo números').optional()
  )
});

const schemaActualizarClinica = z.object({
  nombre: z.string().trim().min(1, 'Nombre de clínica requerido').max(150, 'Nombre demasiado largo').optional(),
  ruc: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^\d{11}$/, 'RUC debe tener 11 dígitos').optional()
  ),
  estado: z.enum(['ACTIVA', 'INACTIVA']).optional(),
  direccion: z.preprocess(
    emptyToUndefined,
    z.string().max(255, 'Dirección demasiado larga').optional()
  ),
  telefono: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^\d{6,20}$/, 'Teléfono debe contener solo números').optional()
  )
}).refine((obj) => Object.keys(obj).length > 0, {
  message: 'Debe enviar al menos un campo para actualizar'
});

module.exports = {
  schemaCrearClinica,
  schemaActualizarClinica
};