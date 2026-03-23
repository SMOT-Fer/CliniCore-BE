const { z } = require('zod');

const pacienteEstado = z.enum(['ACTIVO', 'INACTIVO', 'FALLECIDO']);

const basePacienteSchema = {
  persona_id: z.string().uuid('persona_id invalido'),
  clinica_id: z.string().uuid('clinica_id invalido').optional(),
  codigo_paciente: z.string().trim().max(60).optional(),
  estado: pacienteEstado.optional(),
  fecha_alta: z.string().date('fecha_alta invalida').optional(),
  ocupacion: z.string().trim().max(120).optional(),
  grupo_sanguineo: z.string().trim().max(20).optional(),
  alergias_json: z.array(z.any()).optional(),
  antecedentes_json: z.record(z.any()).optional(),
  contacto_emergencia_nombre: z.string().trim().max(150).optional(),
  contacto_emergencia_telefono: z.string().trim().max(40).optional(),
  observaciones: z.string().trim().max(2000).optional()
};

const schemaCrearPaciente = z.object(basePacienteSchema);

const schemaActualizarPaciente = z.object({
  codigo_paciente: z.string().trim().max(60).optional(),
  estado: pacienteEstado.optional(),
  fecha_alta: z.string().date('fecha_alta invalida').optional(),
  ocupacion: z.string().trim().max(120).optional(),
  grupo_sanguineo: z.string().trim().max(20).optional(),
  alergias_json: z.array(z.any()).optional(),
  antecedentes_json: z.record(z.any()).optional(),
  contacto_emergencia_nombre: z.string().trim().max(150).optional(),
  contacto_emergencia_telefono: z.string().trim().max(40).optional(),
  observaciones: z.string().trim().max(2000).optional()
}).refine((obj) => Object.keys(obj).length > 0, {
  message: 'Debe enviar al menos un campo para actualizar'
});

module.exports = {
  schemaCrearPaciente,
  schemaActualizarPaciente
};
