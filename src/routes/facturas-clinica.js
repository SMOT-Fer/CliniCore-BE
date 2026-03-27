const express = require('express');
const FacturasClinicaController = require('../controllers/facturas-clinica.controller');
const { validateParams } = require('../middlewares/validate-params');
const { validateBody } = require('../middlewares/validate-body');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const {
  schemaFacturaIdParam,
  schemaCrearFactura,
  schemaActualizarFactura,
  schemaCambiarEstado,
} = require('../validators/facturas-clinica.validator');

const router = express.Router();

router.get('/', authorizeRoles(['SUPERADMIN', 'ADMIN', 'ACCOUNTANT']),
  FacturasClinicaController.listar);

router.get('/resumen', authorizeRoles(['SUPERADMIN', 'ADMIN', 'ACCOUNTANT']),
  FacturasClinicaController.resumen);

router.get('/:id', validateParams({ id: schemaFacturaIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'ACCOUNTANT']),
  FacturasClinicaController.obtener);

router.post('/', validateBody(schemaCrearFactura),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'ACCOUNTANT']),
  FacturasClinicaController.crear);

router.put('/:id', validateParams({ id: schemaFacturaIdParam }),
  validateBody(schemaActualizarFactura),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'ACCOUNTANT']),
  FacturasClinicaController.actualizar);

router.patch('/:id/estado', validateParams({ id: schemaFacturaIdParam }),
  validateBody(schemaCambiarEstado),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'ACCOUNTANT']),
  FacturasClinicaController.cambiarEstado);

router.delete('/:id', validateParams({ id: schemaFacturaIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  FacturasClinicaController.eliminar);

module.exports = router;
