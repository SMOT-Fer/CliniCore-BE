const express = require('express');
const PlatformController = require('../controllers/platform.controller');
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const { validateBody } = require('../middlewares/validate-body');
const { validateParams } = require('../middlewares/validate-params');
const { schemaIdParam } = require('../validators/common.validator');
const {
  schemaCrearPlan,
  schemaActualizarPlan,
  schemaAsignarPlanEmpresa
} = require('../validators/platform.validator');

const router = express.Router();

router.use(authenticateToken);

router.get('/mi-suscripcion', PlatformController.miSuscripcion);

router.get('/planes', authorizeRoles('SUPERADMIN'), PlatformController.listarPlanes);
router.post('/planes', authorizeRoles('SUPERADMIN'), validateBody(schemaCrearPlan), PlatformController.crearPlan);
router.put('/planes/:id', authorizeRoles('SUPERADMIN'), validateParams(schemaIdParam), validateBody(schemaActualizarPlan), PlatformController.actualizarPlan);

router.get('/suscripciones/vigentes', authorizeRoles('SUPERADMIN'), PlatformController.listarSuscripcionesVigentes);
router.get('/suscripciones/empresa/:empresaId', authorizeRoles('SUPERADMIN'), validateParams(schemaIdParam), PlatformController.listarHistorialPorEmpresa);
router.post('/suscripciones/asignar', authorizeRoles('SUPERADMIN'), validateBody(schemaAsignarPlanEmpresa), PlatformController.asignarPlanEmpresa);

module.exports = router;
