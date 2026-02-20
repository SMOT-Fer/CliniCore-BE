const express = require('express');
const AuditLogController = require('../controllers/audit-log.controller');
const { authorizeRoles } = require('../middlewares/authorize-roles');

const router = express.Router();

// Solo SUPERADMIN puede ver audit logs
/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Listar cambios en auditoría
 *     tags: [Auditoría]
 *     parameters:
 *       - in: query
 *         name: tabla_nombre
 *         schema:
 *           type: string
 *         description: Filtrar por tabla (usuarios, clinicas, etc)
 *       - in: query
 *         name: operacion
 *         schema:
 *           type: string
 *           enum: [CREATE, UPDATE, DELETE]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           maximum: 500
 *     responses:
 *       200:
 *         description: Lista de cambios
 *       403:
 *         description: No autorizado
 */
router.get('/', authorizeRoles('SUPERADMIN'), AuditLogController.listar);

/**
 * @swagger
 * /api/audit-logs/{recordId}:
 *   get:
 *     summary: Ver historia completa de un registro
 *     tags: [Auditoría]
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Historia de cambios del registro
 *       403:
 *         description: No autorizado
 */
router.get('/:recordId', authorizeRoles('SUPERADMIN'), AuditLogController.verHistoria);

module.exports = router;
