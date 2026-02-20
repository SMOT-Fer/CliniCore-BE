const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const { validateParams } = require('../middlewares/validate-params');
const { schemaIdParam } = require('../validators/common.validator');

router.use(authenticateToken);
router.use(authorizeRoles('SUPERADMIN'));

router.get('/sesiones', AdminController.listarSesiones);
router.get('/system-status', AdminController.estadoSistema);
router.post('/sesiones/:id/revocar', validateParams(schemaIdParam), AdminController.revocarSesion);
router.post('/usuarios/:id/revocar-sesiones', validateParams(schemaIdParam), AdminController.revocarSesionesPorUsuario);

module.exports = router;
