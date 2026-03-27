const express = require('express');
const ClinicaIntegracionesController = require('../controllers/clinica-integraciones.controller');
const { validateParams } = require('../middlewares/validate-params');
const { validateBody } = require('../middlewares/validate-body');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const {
  schemaIntegracionIdParam,
  schemaCrearIntegracion,
  schemaActualizarIntegracion,
} = require('../validators/clinica-integraciones.validator');

const router = express.Router();

router.get('/', authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF']),
  ClinicaIntegracionesController.listar);

router.get('/:id', validateParams({ id: schemaIntegracionIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF']),
  ClinicaIntegracionesController.obtener);

router.post('/', validateBody(schemaCrearIntegracion),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  ClinicaIntegracionesController.crear);

router.put('/:id', validateParams({ id: schemaIntegracionIdParam }),
  validateBody(schemaActualizarIntegracion),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  ClinicaIntegracionesController.actualizar);

router.delete('/:id', validateParams({ id: schemaIntegracionIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  ClinicaIntegracionesController.eliminar);

module.exports = router;
