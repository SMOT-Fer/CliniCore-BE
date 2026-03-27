const express = require('express');
const ApiKeysController = require('../controllers/api-keys.controller');
const { validateParams } = require('../middlewares/validate-params');
const { validateBody } = require('../middlewares/validate-body');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const {
  schemaApiKeyIdParam,
  schemaCrearApiKey,
  schemaActualizarApiKey,
} = require('../validators/api-keys.validator');

const router = express.Router();

router.get('/', authorizeRoles(['SUPERADMIN', 'ADMIN']),
  ApiKeysController.listar);

router.get('/:id', validateParams({ id: schemaApiKeyIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  ApiKeysController.obtener);

router.post('/', validateBody(schemaCrearApiKey),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  ApiKeysController.crear);

router.put('/:id', validateParams({ id: schemaApiKeyIdParam }),
  validateBody(schemaActualizarApiKey),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  ApiKeysController.actualizar);

router.patch('/:id/revocar', validateParams({ id: schemaApiKeyIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  ApiKeysController.revocar);

router.delete('/:id', validateParams({ id: schemaApiKeyIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  ApiKeysController.eliminar);

module.exports = router;
