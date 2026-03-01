const express = require('express');
const router = express.Router();
const TiposNegocioController = require('../controllers/tipos-negocio.controller');
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const { validateParams } = require('../middlewares/validate-params');
const { schemaIdParam } = require('../validators/common.validator');

router.use(authenticateToken);

router.get('/', authorizeRoles('SUPERADMIN', 'ADMIN'), TiposNegocioController.listar);
router.get('/:id', authorizeRoles('SUPERADMIN', 'ADMIN'), validateParams(schemaIdParam), TiposNegocioController.obtenerPorId);

router.post('/', authorizeRoles('SUPERADMIN'), TiposNegocioController.crear);
router.put('/:id', authorizeRoles('SUPERADMIN'), validateParams(schemaIdParam), TiposNegocioController.actualizar);
router.delete('/:id', authorizeRoles('SUPERADMIN'), validateParams(schemaIdParam), TiposNegocioController.eliminar);

module.exports = router;
