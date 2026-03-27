const { z } = require('zod');

const schemaMetrica = z.enum([
  'usuarios_activos',
  'pacientes_registrados',
  'consultas_realizadas',
  'recetas_emitidas',
  'otros_eventos',
]);

const schemaIncrementarMetrica = z.object({
  metrica: schemaMetrica,
  cantidad: z.number().positive().optional().default(1),
}).strict();

module.exports = {
  schemaMetrica,
  schemaIncrementarMetrica,
};
