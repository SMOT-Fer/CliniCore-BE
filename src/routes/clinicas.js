const express = require('express');
const router = express.Router();
const ClinicasController = require('../controllers/clinicas.controller');
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const { validateBody } = require('../middlewares/validate-body');
const { validateParams } = require('../middlewares/validate-params');
const { schemaCrearClinica, schemaActualizarClinica } = require('../validators/clinicas.validator');
const { schemaIdParam } = require('../validators/common.validator');

router.get('/public/activas', ClinicasController.obtenerActivasPublicas);

router.use(authenticateToken);

router.get('/', authorizeRoles('SUPERADMIN', 'ADMIN'), ClinicasController.obtenerTodas);

router.get('/:id', authorizeRoles('SUPERADMIN', 'ADMIN'), validateParams(schemaIdParam), ClinicasController.obtenerPorId);

router.post('/', authorizeRoles('SUPERADMIN'), validateBody(schemaCrearClinica), ClinicasController.crear);

router.put('/:id', authorizeRoles('SUPERADMIN'), validateParams(schemaIdParam), validateBody(schemaActualizarClinica), ClinicasController.actualizar);

router.post('/:id/desactivar', authorizeRoles('SUPERADMIN'), validateParams(schemaIdParam), ClinicasController.desactivar);

router.post('/:id/reactivar', authorizeRoles('SUPERADMIN'), validateParams(schemaIdParam), ClinicasController.reactivar);

router.delete('/:id', authorizeRoles('SUPERADMIN'), validateParams(schemaIdParam), ClinicasController.eliminar);

module.exports = router;
