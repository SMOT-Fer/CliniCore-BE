const express = require('express');
const UsuarioEspecialidadesController = require('../controllers/usuario-especialidades.controller');
const { validateParams } = require('../middlewares/validate-params');
const { validateBody } = require('../middlewares/validate-body');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const {
  schemaEspecialidadIdParam,
  schemaCrearEspecialidad,
  schemaActualizarEspecialidad,
} = require('../validators/usuario-especialidades.validator');

const router = express.Router();

router.get('/', authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF']),
  UsuarioEspecialidadesController.listar);

router.get('/especialistas', authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF']),
  UsuarioEspecialidadesController.listarEspecialistas);

router.get('/:id', validateParams({ id: schemaEspecialidadIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF']),
  UsuarioEspecialidadesController.obtener);

router.post('/', validateBody(schemaCrearEspecialidad),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR']),
  UsuarioEspecialidadesController.crear);

router.put('/:id', validateParams({ id: schemaEspecialidadIdParam }),
  validateBody(schemaActualizarEspecialidad),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR']),
  UsuarioEspecialidadesController.actualizar);

router.delete('/:id', validateParams({ id: schemaEspecialidadIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR']),
  UsuarioEspecialidadesController.eliminar);

module.exports = router;
