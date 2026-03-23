const express = require('express');
const router = express.Router();
const PacientesController = require('../controllers/pacientes.controller');
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const { validateBody } = require('../middlewares/validate-body');
const { validateParams } = require('../middlewares/validate-params');
const { schemaIdParam } = require('../validators/common.validator');
const { schemaCrearPaciente, schemaActualizarPaciente } = require('../validators/pacientes.validator');

router.use(authenticateToken);

router.get('/', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), PacientesController.listar);
router.get('/:id', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), validateParams(schemaIdParam), PacientesController.obtenerPorId);
router.post('/', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), validateBody(schemaCrearPaciente), PacientesController.crear);
router.put('/:id', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), validateParams(schemaIdParam), validateBody(schemaActualizarPaciente), PacientesController.actualizar);
router.post('/:id/desactivar', authorizeRoles('SUPERADMIN', 'ADMIN'), validateParams(schemaIdParam), PacientesController.desactivar);
router.post('/:id/reactivar', authorizeRoles('SUPERADMIN', 'ADMIN'), validateParams(schemaIdParam), PacientesController.reactivar);

module.exports = router;
