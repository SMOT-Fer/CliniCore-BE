const express = require('express');
const MfaChallengesController = require('../controllers/mfa-challenges.controller');
const { validateParams } = require('../middlewares/validate-params');
const { validateBody } = require('../middlewares/validate-body');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const { schemaResponderDesafio } = require('../validators/mfa-challenges.validator');

const router = express.Router();

router.post('/crear', authorizeRoles(['SYSTEM']),
  MfaChallengesController.crearDesafio);

router.post('/responder', validateBody(schemaResponderDesafio),
  MfaChallengesController.responderDesafio);

router.post('/limpiar', authorizeRoles(['SYSTEM']),
  MfaChallengesController.limpiar);

module.exports = router;
