const express = require('express');
const router = express.Router();
const UsuariosController = require('../controllers/usuarios.controller');
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const { authLimiter } = require('../middlewares/rate-limit');
const { validateBody } = require('../middlewares/validate-body');
const { validateParams } = require('../middlewares/validate-params');
const { schemaLogin, schemaCrearUsuario, schemaActualizarUsuario } = require('../validators/usuarios.validator');
const { schemaIdParam } = require('../validators/common.validator');

router.post('/login', authLimiter, validateBody(schemaLogin), UsuariosController.login);
router.post('/refresh', authLimiter, UsuariosController.refresh);
router.post('/logout', UsuariosController.logout);
router.get('/csrf', UsuariosController.csrf);

router.use(authenticateToken);

router.get('/me', UsuariosController.miSesion);

router.get('/', authorizeRoles('SUPERADMIN', 'ADMIN'), UsuariosController.obtenerTodos);

router.get('/:id', authorizeRoles('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF'), validateParams(schemaIdParam), UsuariosController.obtenerPorId);

router.post('/', authorizeRoles('SUPERADMIN', 'ADMIN'), validateBody(schemaCrearUsuario), UsuariosController.crear);

router.put('/:id', authorizeRoles('SUPERADMIN', 'ADMIN'), validateParams(schemaIdParam), validateBody(schemaActualizarUsuario), UsuariosController.actualizar);

router.post('/:id/desactivar', authorizeRoles('SUPERADMIN', 'ADMIN'), validateParams(schemaIdParam), UsuariosController.desactivar);

router.post('/:id/reactivar', authorizeRoles('SUPERADMIN', 'ADMIN'), validateParams(schemaIdParam), UsuariosController.reactivar);

router.delete('/:id', authorizeRoles('SUPERADMIN'), validateParams(schemaIdParam), UsuariosController.eliminar);

module.exports = router;
