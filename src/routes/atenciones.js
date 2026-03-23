const express = require('express');
const router = express.Router();
const AtencionesController = require('../controllers/atenciones.controller');
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const { validateBody } = require('../middlewares/validate-body');
const { validateParams } = require('../middlewares/validate-params');
const { schemaIdParam } = require('../validators/common.validator');
const {
  schemaCrearAtencion,
  schemaActualizarAtencion,
  schemaSignos,
  schemaDiagnosticos,
  schemaReceta
} = require('../validators/atenciones.validator');

router.use(authenticateToken);

router.get('/', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), AtencionesController.listar);
router.get('/:id', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), validateParams(schemaIdParam), AtencionesController.obtenerDetalle);
router.post('/', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), validateBody(schemaCrearAtencion), AtencionesController.crear);
router.put('/:id', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), validateParams(schemaIdParam), validateBody(schemaActualizarAtencion), AtencionesController.actualizar);
router.post('/:id/signos', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), validateParams(schemaIdParam), validateBody(schemaSignos), AtencionesController.agregarSignos);
router.post('/:id/diagnosticos', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), validateParams(schemaIdParam), validateBody(schemaDiagnosticos), AtencionesController.agregarDiagnosticos);
router.post('/:id/receta', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), validateParams(schemaIdParam), validateBody(schemaReceta), AtencionesController.crearReceta);

module.exports = router;
