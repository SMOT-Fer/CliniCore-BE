const express = require('express');
const router = express.Router();
const EmpresasController = require('../controllers/empresas.controller');
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const { validateBody } = require('../middlewares/validate-body');
const { validateParams } = require('../middlewares/validate-params');
const { schemaCrearEmpresa, schemaActualizarEmpresa } = require('../validators/empresas.validator');
const { schemaIdParam } = require('../validators/common.validator');

router.get('/public/activas', EmpresasController.obtenerActivasPublicas);

router.use(authenticateToken);

router.get('/', authorizeRoles('SUPERADMIN', 'ADMIN'), EmpresasController.obtenerTodas);

router.get('/:id', authorizeRoles('SUPERADMIN', 'ADMIN'), validateParams(schemaIdParam), EmpresasController.obtenerPorId);

router.post('/', authorizeRoles('SUPERADMIN'), validateBody(schemaCrearEmpresa), EmpresasController.crear);

router.put('/:id', authorizeRoles('SUPERADMIN'), validateParams(schemaIdParam), validateBody(schemaActualizarEmpresa), EmpresasController.actualizar);

router.post('/:id/desactivar', authorizeRoles('SUPERADMIN'), validateParams(schemaIdParam), EmpresasController.desactivar);

router.post('/:id/reactivar', authorizeRoles('SUPERADMIN'), validateParams(schemaIdParam), EmpresasController.reactivar);

router.delete('/:id', authorizeRoles('SUPERADMIN'), validateParams(schemaIdParam), EmpresasController.eliminar);

module.exports = router;
