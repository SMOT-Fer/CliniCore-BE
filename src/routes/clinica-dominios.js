const express = require('express');
const ClinicaDominiosController = require('../controllers/clinica-dominios.controller');
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const { validateBody } = require('../middlewares/validate-body');
const { validateParams } = require('../middlewares/validate-params');
const { schemaIdParam } = require('../validators/common.validator');
const { schemaCrearClinicaDominio, schemaActualizarClinicaDominio } = require('../validators/clinica-dominios.validator');

const router = express.Router();

router.use(authenticateToken);

router.get('/', authorizeRoles('SUPERADMIN', 'ADMIN'), ClinicaDominiosController.listar);
router.post('/', authorizeRoles('SUPERADMIN', 'ADMIN'), validateBody(schemaCrearClinicaDominio), ClinicaDominiosController.crear);
router.put('/:id', authorizeRoles('SUPERADMIN', 'ADMIN'), validateParams(schemaIdParam), validateBody(schemaActualizarClinicaDominio), ClinicaDominiosController.actualizar);
router.delete('/:id', authorizeRoles('SUPERADMIN', 'ADMIN'), validateParams(schemaIdParam), ClinicaDominiosController.eliminar);

module.exports = router;
