const express = require('express');
const router = express.Router();
const TiposNegocioController = require('../controllers/tipos-negocio.controller');
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const { validateParams } = require('../middlewares/validate-params');
const { validateBody } = require('../middlewares/validate-body');
const { schemaCrearTipoNegocio, schemaActualizarTipoNegocio, schemaTipoNegocioIdParam } = require('../validators/tipos-negocio.validator');

router.use(authenticateToken);

router.get('/', authorizeRoles('SUPERADMIN', 'ADMIN'), TiposNegocioController.listar);
router.get('/:id', authorizeRoles('SUPERADMIN', 'ADMIN'), validateParams(schemaTipoNegocioIdParam), TiposNegocioController.obtenerPorId);

router.post('/', authorizeRoles('SUPERADMIN'), validateBody(schemaCrearTipoNegocio), TiposNegocioController.crear);
router.put('/:id', authorizeRoles('SUPERADMIN'), validateParams(schemaTipoNegocioIdParam), validateBody(schemaActualizarTipoNegocio), TiposNegocioController.actualizar);
router.delete('/:id', authorizeRoles('SUPERADMIN'), validateParams(schemaTipoNegocioIdParam), TiposNegocioController.eliminar);

module.exports = router;
