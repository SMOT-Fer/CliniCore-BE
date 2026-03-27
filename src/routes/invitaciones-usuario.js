const express = require('express');
const InvitacionesUsuarioController = require('../controllers/invitaciones-usuario.controller');
const { validateParams } = require('../middlewares/validate-params');
const { validateBody } = require('../middlewares/validate-body');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const {
  schemaInvitacionIdParam,
  schemaCrearInvitacion,
  schemaAceptarInvitacion,
} = require('../validators/invitaciones-usuario.validator');

const router = express.Router();

router.get('/', authorizeRoles(['SUPERADMIN', 'ADMIN']),
  InvitacionesUsuarioController.listar);

router.get('/:id', validateParams({ id: schemaInvitacionIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  InvitacionesUsuarioController.obtener);

router.post('/', validateBody(schemaCrearInvitacion),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  InvitacionesUsuarioController.crear);

router.post('/aceptar', validateBody(schemaAceptarInvitacion),
  InvitacionesUsuarioController.aceptar);

router.post('/rechazar', authorizeRoles(['ADMIN', 'DOCTOR', 'STAFF']),
  InvitacionesUsuarioController.rechazar);

router.delete('/:id', validateParams({ id: schemaInvitacionIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  InvitacionesUsuarioController.cancelar);

module.exports = router;
