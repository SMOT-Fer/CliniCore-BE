const { z } = require('zod');

const schemaEspecialidadIdParam = z.string().min(1, 'ID debe ser válido');

const schemaEspecialidad = z.enum([
  'CARDIOLOGIA',
  'DERMATOLOGIA',
  'ENDOCRINOLOGIA',
  'GASTROENTEROLOGIA',
  'GINECOLOGIA',
  'NEUROLOGIA',
  'OFTALMOLOGIA',
  'ONCOLOGIA',
  'OTORRINOLARINGOLOGIA',
  'PEDIATRIA',
  'PSIQUIATRIA',
  'REUMATOLOGIA',
  'TRAUMATOLOGIA',
  'UROLOGIA',
  'GENERAL',
]).default('GENERAL');

const schemaCrearEspecialidad = z.object({
  especialidad: schemaEspecialidad,
  anios_experiencia: z.number().nonnegative().optional(),
  numero_registro: z.string().min(1).max(100),
  organo_colegiador: z.string().min(1).max(255).optional(),
}).strict();

const schemaActualizarEspecialidad = z.object({
  anios_experiencia: z.number().nonnegative().optional(),
  numero_registro: z.string().min(1).max(100).optional(),
  organo_colegiador: z.string().min(1).max(255).optional(),
  activo: z.boolean().optional(),
}).strict().refine(
  (data) => Object.keys(data).filter((k) => data[k] !== undefined).length > 0,
  { message: 'Al menos un campo debe ser actualizado' }
);

module.exports = {
  schemaEspecialidadIdParam,
  schemaEspecialidad,
  schemaCrearEspecialidad,
  schemaActualizarEspecialidad,
};
