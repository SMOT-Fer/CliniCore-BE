const { z } = require('zod');

const estadoPlanEnum = z.enum(['ACTIVO', 'INACTIVO']);
const estadoSuscripcionEnum = z.enum(['TRIAL', 'ACTIVA', 'PAST_DUE', 'SUSPENDIDA', 'CANCELADA', 'EXPIRADA']);

const nullableNumber = z.union([
  z.number().int().nonnegative(),
  z.null()
]);

const schemaCrearPlan = z.object({
  codigo: z.string().trim().min(3).max(80),
  nombre: z.string().trim().min(3).max(150),
  descripcion: z.string().trim().max(500).optional(),
  moneda: z.string().trim().length(3).optional(),
  precio_mensual: z.number().nonnegative().optional(),
  precio_anual: z.number().nonnegative().optional(),
  max_usuarios: nullableNumber.optional(),
  max_pacientes_activos: nullableNumber.optional(),
  max_storage_gb: nullableNumber.optional(),
  incluye_facturacion_electronica: z.boolean().optional(),
  incluye_historia_clinica_avanzada: z.boolean().optional(),
  incluye_integraciones: z.boolean().optional(),
  incluye_api: z.boolean().optional(),
  dias_trial: z.number().int().nonnegative().max(60).optional(),
  estado: estadoPlanEnum.optional()
});

const schemaActualizarPlan = schemaCrearPlan.partial().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: 'Debe enviar al menos un campo para actualizar' }
);

const schemaAsignarPlanEmpresa = z.object({
  empresa_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  estado: estadoSuscripcionEnum.optional(),
  duracion_dias: z.number().int().positive().max(365).optional()
});

module.exports = {
  schemaCrearPlan,
  schemaActualizarPlan,
  schemaAsignarPlanEmpresa
};
