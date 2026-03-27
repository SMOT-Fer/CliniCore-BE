const express = require('express');
const RecetasMedicasController = require('../controllers/recetas-medicas.controller');
const { validateParams } = require('../middlewares/validate-params');
const { validateBody } = require('../middlewares/validate-body');
const { authorizeRoles } = require('../middlewares/authorize-roles');
const {
  schemaRecetaIdParam,
  schemaCrearReceta,
  schemaActualizarReceta,
} = require('../validators/recetas-medicas.validator');

const router = express.Router();

router.get('/', authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF']),
  RecetasMedicasController.listar);

router.get('/vigentes', authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF']),
  RecetasMedicasController.listarVigentes);

router.get('/expirando', authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF']),
  RecetasMedicasController.listarExpirando);

router.get('/:id', validateParams({ id: schemaRecetaIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF']),
  RecetasMedicasController.obtener);

router.post('/', validateBody(schemaCrearReceta),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR']),
  RecetasMedicasController.crear);

router.put('/:id', validateParams({ id: schemaRecetaIdParam }),
  validateBody(schemaActualizarReceta),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR']),
  RecetasMedicasController.actualizar);

router.patch('/:id/anular', validateParams({ id: schemaRecetaIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'DOCTOR']),
  RecetasMedicasController.anular);

router.delete('/:id', validateParams({ id: schemaRecetaIdParam }),
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  RecetasMedicasController.eliminar);

module.exports = router;
