const express = require('express');
const router = express.Router();
const PersonasController = require('../controllers/personas.controller');
const { authenticateToken } = require('../middlewares/auth');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const { validateBody } = require('../middlewares/validate-body');
const { validateParams } = require('../middlewares/validate-params');
const { schemaCrearPersona, schemaActualizarPersona } = require('../validators/personas.validator');
const { schemaIdParam, schemaDniParam } = require('../validators/common.validator');

router.use(authenticateToken);

/**
 * GET /api/personas - Obtener todas las personas
 */
router.get('/', authorizeRoles('SUPERADMIN', 'ADMIN'), PersonasController.obtenerTodas);

/**
 * GET /api/personas/dni/:dni - Obtener por DNI (con búsqueda en API si no existe)
 * Primero busca en BD, si no existe busca en API y agrega a BD
 */
router.get('/dni/:dni', authorizeRoles('SUPERADMIN', 'ADMIN'), validateParams(schemaDniParam), PersonasController.obtenerPorDni);

/**
 * GET /api/personas/:id - Obtener persona por ID
 */
router.get('/:id', authorizeRoles('SUPERADMIN', 'ADMIN'), validateParams(schemaIdParam), PersonasController.obtenerPorId);

/**
 * POST /api/personas - Crear nueva persona
 */
router.post('/', authorizeRoles('SUPERADMIN', 'ADMIN'), validateBody(schemaCrearPersona), PersonasController.crear);

/**
 * PUT /api/personas/:id - Actualizar persona
 */
router.put('/:id', authorizeRoles('SUPERADMIN', 'ADMIN'), validateParams(schemaIdParam), validateBody(schemaActualizarPersona), PersonasController.actualizar);

/**
 * DELETE /api/personas/:id - Eliminar persona
 */
router.delete('/:id', authorizeRoles('SUPERADMIN', 'ADMIN'), validateParams(schemaIdParam), PersonasController.eliminar);

module.exports = router;
