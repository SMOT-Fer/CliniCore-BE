const express = require('express');
const OutboxEventosController = require('../controllers/outbox-eventos.controller');
const { validateBody } = require('../middlewares/validate-body');
const { authorizeRoles } = require('../middlewares/authorize-roles');

const router = express.Router();

router.get('/', authorizeRoles(['SUPERADMIN', 'ADMIN', 'SYSTEM']),
  OutboxEventosController.listar);

router.get('/sin-procesar', authorizeRoles(['SUPERADMIN', 'ADMIN', 'SYSTEM']),
  OutboxEventosController.listarSinProcesar);

router.post('/marcar-procesado', authorizeRoles(['SYSTEM']),
  OutboxEventosController.marcarProcesado);

router.post('/limpiar', authorizeRoles(['SYSTEM']),
  OutboxEventosController.limpiar);

module.exports = router;
