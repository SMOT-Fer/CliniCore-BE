const { z } = require('zod');

const schemaLogin = z.object({
  email: z.string().trim().min(1, 'Email requerido').email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida')
});

const schemaCrearUsuario = z.object({
  clinica_id: z.string().uuid().nullable().optional(),
  empresa_id: z.string().uuid().nullable().optional(),
  persona_id: z.string().uuid('persona_id inválido'),
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(8, 'Password mínimo 8 caracteres'),
  rol: z.enum(['ADMIN', 'DOCTOR', 'STAFF']),
  estado: z.enum(['ACTIVO', 'INACTIVO']).optional()
});

const schemaActualizarUsuario = z.object({
  clinica_id: z.string().uuid().nullable().optional(),
  empresa_id: z.string().uuid().nullable().optional(),
  persona_id: z.string().uuid('persona_id inválido').optional(),
  email: z.string().trim().email('Email inválido').optional(),
  password: z.string().min(8, 'Password mínimo 8 caracteres').optional(),
  rol: z.enum(['ADMIN', 'DOCTOR', 'STAFF']).optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO']).optional()
}).refine((obj) => Object.keys(obj).length > 0, {
  message: 'Debe enviar al menos un campo para actualizar'
});

module.exports = {
  schemaLogin,
  schemaCrearUsuario,
  schemaActualizarUsuario
};
