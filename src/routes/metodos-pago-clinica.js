const express = require('express');
const MetodosPagoClinicaController = require('../controllers/metodos-pago-clinica.controller');
const { validateParams } = require('../middlewares/validate-params');
const { validateBody } = require('../middlewares/validate-body');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const {
  schemaMetodoIdParam,
  schemaCrearMetodo,
  schemaActualizarMetodo,
} = require('../validators/metodos-pago-clinica.validator');

const router = express.Router();

router.get('/', authorizeRoles(['SUPERADMIN', 'ADMIN']),
  MetodosPagoClinicaController.listar);

router.get('/:id', validateParams({ id: schemaMetodoIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  MetodosPagoClinicaController.obtener);

router.post('/', validateBody(schemaCrearMetodo),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  MetodosPagoClinicaController.crear);

router.put('/:id', validateParams({ id: schemaMetodoIdParam }),
  validateBody(schemaActualizarMetodo),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  MetodosPagoClinicaController.actualizar);

router.delete('/:id', validateParams({ id: schemaMetodoIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  MetodosPagoClinicaController.eliminar);

module.exports = router;
