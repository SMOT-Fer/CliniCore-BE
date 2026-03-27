const express = require('express');
const WebhookEventosPagoController = require('../controllers/webhook-eventos-pago.controller');
const { validateParams } = require('../middlewares/validate-params');
const { validateBody } = require('../middlewares/validate-body');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const {
  schemaWebhookEventoIdParam,
  schemaCrearWebhookEvento,
  schemaActualizarWebhookEvento,
} = require('../validators/webhook-eventos-pago.validator');

const router = express.Router();

// Admin endpoints
router.get('/', authorizeRoles(['SUPERADMIN', 'ADMIN']),
  WebhookEventosPagoController.listar);

router.get('/:id', validateParams({ id: schemaWebhookEventoIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  WebhookEventosPagoController.obtener);

// Webhook receiver (sin auth - usa signature verification en producción)
router.post('/webhook/receive', validateBody(schemaCrearWebhookEvento),
  WebhookEventosPagoController.recibirEvento);

router.patch('/:id/procesar', validateParams({ id: schemaWebhookEventoIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'SYSTEM']),
  WebhookEventosPagoController.marcarProcesado);

module.exports = router;
