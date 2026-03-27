const express = require('express');
const ClinicaConfiguracionController = require('../controllers/clinica-configuracion.controller');
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const { validateBody } = require('../middlewares/validate-body');
const { schemaGuardarClinicaConfiguracion } = require('../validators/clinica-configuracion.validator');

const router = express.Router();

router.use(authenticateToken);

router.get('/', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), ClinicaConfiguracionController.obtener);
router.put('/', authorizeRoles('SUPERADMIN', 'ADMIN'), validateBody(schemaGuardarClinicaConfiguracion), ClinicaConfiguracionController.guardar);

module.exports = router;
