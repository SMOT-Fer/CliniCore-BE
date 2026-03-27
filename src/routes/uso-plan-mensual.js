const express = require('express');
const UsoPlanMensualController = require('../controllers/uso-plan-mensual.controller');
const { validateBody } = require('../middlewares/validate-body');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const { schemaIncrementarMetrica } = require('../validators/uso-plan-mensual.validator');

const router = express.Router();

router.get('/', authorizeRoles(['SUPERADMIN', 'ADMIN']),
  UsoPlanMensualController.obtener);

router.get('/historico', authorizeRoles(['SUPERADMIN', 'ADMIN']),
  UsoPlanMensualController.listar);

router.get('/resumen-anual', authorizeRoles(['SUPERADMIN', 'ADMIN']),
  UsoPlanMensualController.resumenAnual);

router.post('/incrementar', validateBody(schemaIncrementarMetrica),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'SYSTEM']),
  UsoPlanMensualController.incrementar);

module.exports = router;
