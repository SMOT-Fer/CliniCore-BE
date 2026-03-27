const express = require('express');
const MfaFactorsController = require('../controllers/mfa-factors.controller');
const { validateParams } = require('../middlewares/validate-params');
const { validateBody } = require('../middlewares/validate-body');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const {
  schemaMfaFactorIdParam,
  schemaCrearMfaFactor,
  schemaVerificarMfaFactor,
  schemaDesactivarMfaFactor,
} = require('../validators/mfa-factors.validator');

const router = express.Router();

router.get('/', authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF']),
  MfaFactorsController.listar);

router.get('/:id', validateParams({ id: schemaMfaFactorIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF']),
  MfaFactorsController.obtener);

router.post('/', validateBody(schemaCrearMfaFactor),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF']),
  MfaFactorsController.crear);

router.post('/:id/verificar', validateParams({ id: schemaMfaFactorIdParam }),
  validateBody(schemaVerificarMfaFactor),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF']),
  MfaFactorsController.verificar);

router.patch('/:id/desactivar', validateParams({ id: schemaMfaFactorIdParam }),
  validateBody(schemaDesactivarMfaFactor),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF']),
  MfaFactorsController.desactivar);

router.delete('/:id', validateParams({ id: schemaMfaFactorIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  MfaFactorsController.eliminar);

module.exports = router;
