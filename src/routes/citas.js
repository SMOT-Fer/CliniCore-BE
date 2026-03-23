const express = require('express');
const router = express.Router();
const CitasController = require('../controllers/citas.controller');
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const { validateBody } = require('../middlewares/validate-body');
const { validateParams } = require('../middlewares/validate-params');
const { schemaIdParam } = require('../validators/common.validator');
const { schemaCrearCita, schemaActualizarCita } = require('../validators/citas.validator');

router.use(authenticateToken);

router.get('/', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), CitasController.listar);
router.get('/:id', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), validateParams(schemaIdParam), CitasController.obtenerPorId);
router.post('/', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), validateBody(schemaCrearCita), CitasController.crear);
router.put('/:id', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), validateParams(schemaIdParam), validateBody(schemaActualizarCita), CitasController.actualizar);

module.exports = router;
