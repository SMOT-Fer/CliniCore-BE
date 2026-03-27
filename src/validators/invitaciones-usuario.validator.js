const { z } = require('zod');

const schemaInvitacionIdParam = z.string().min(1, 'ID debe ser válido');

const schemaRol = z.enum(['ADMIN', 'DOCTOR', 'STAFF', 'ACCOUNTANT', 'RECEPCION']).default('STAFF');

const schemaEstadoInvitacion = z.enum(['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA', 'EXPIRADA']);

const schemaCrearInvitacion = z.object({
  email: z.string().email('Email inválido'),
  rol: schemaRol,
}).strict();

const schemaAceptarInvitacion = z.object({
  token: z.string().min(32),
  usuario_id: z.string().min(1),
}).strict();

module.exports = {
  schemaInvitacionIdParam,
  schemaRol,
  schemaEstadoInvitacion,
  schemaCrearInvitacion,
  schemaAceptarInvitacion,
};
