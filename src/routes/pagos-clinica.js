const express = require('express');
const PagosClinicaController = require('../controllers/pagos-clinica.controller');
const { validateParams } = require('../middlewares/validate-params');
const { validateBody } = require('../middlewares/validate-body');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const {
  schemaPagoIdParam,
  schemaCrearPago,
  schemaActualizarPago,
  schemaMarcarCompletado,
  schemaMarcarRechazado,
} = require('../validators/pagos-clinica.validator');

const router = express.Router();

router.get('/', authorizeRoles(['SUPERADMIN', 'ADMIN', 'ACCOUNTANT']),
  PagosClinicaController.listar);

router.get('/resumen', authorizeRoles(['SUPERADMIN', 'ADMIN', 'ACCOUNTANT']),
  PagosClinicaController.resumen);

router.get('/:id', validateParams({ id: schemaPagoIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'ACCOUNTANT']),
  PagosClinicaController.obtener);

router.post('/', validateBody(schemaCrearPago),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  PagosClinicaController.crear);

router.put('/:id', validateParams({ id: schemaPagoIdParam }),
  validateBody(schemaActualizarPago),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  PagosClinicaController.actualizar);

router.patch('/:id/completar', validateParams({ id: schemaPagoIdParam }),
  validateBody(schemaMarcarCompletado),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'SYSTEM']),
  PagosClinicaController.marcarCompletado);

router.patch('/:id/rechazar', validateParams({ id: schemaPagoIdParam }),
  validateBody(schemaMarcarRechazado),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  PagosClinicaController.marcarRechazado);

router.delete('/:id', validateParams({ id: schemaPagoIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  PagosClinicaController.eliminar);

module.exports = router;
