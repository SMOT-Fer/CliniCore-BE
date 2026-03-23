-- 008_core_clinical_schema.sql
-- Base clinica operativa minima para iniciar produccion:
-- pacientes, citas, historia clinica, atenciones, diagnosticos, recetas y adjuntos.
-- Requiere tabla public.clinicas (migracion 005).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF to_regclass('public.clinicas') IS NULL THEN
    RAISE EXCEPTION 'No existe public.clinicas. Ejecuta primero la migracion 005_rename_empresa_a_clinica.sql';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paciente_estado') THEN
    CREATE TYPE paciente_estado AS ENUM ('ACTIVO', 'INACTIVO', 'FALLECIDO');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cita_estado') THEN
    CREATE TYPE cita_estado AS ENUM ('PROGRAMADA', 'CONFIRMADA', 'EN_CURSO', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO', 'REPROGRAMADA');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cita_canal') THEN
    CREATE TYPE cita_canal AS ENUM ('PRESENCIAL', 'VIRTUAL', 'DOMICILIO');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'atencion_estado') THEN
    CREATE TYPE atencion_estado AS ENUM ('ABIERTA', 'CERRADA', 'ANULADA');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'archivo_clinico_tipo') THEN
    CREATE TYPE archivo_clinico_tipo AS ENUM ('RESULTADO', 'IMAGEN', 'RECETA', 'CONSENTIMIENTO', 'OTRO');
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Pacientes
CREATE TABLE IF NOT EXISTS public.pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE RESTRICT,
  codigo_paciente TEXT,
  estado paciente_estado NOT NULL DEFAULT 'ACTIVO',
  fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE,
  ocupacion TEXT,
  grupo_sanguineo TEXT,
  alergias_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  antecedentes_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  contacto_emergencia_nombre TEXT,
  contacto_emergencia_telefono TEXT,
  observaciones TEXT,
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  CONSTRAINT uq_pacientes_clinica_persona UNIQUE (clinica_id, persona_id),
  CONSTRAINT uq_pacientes_clinica_codigo UNIQUE (clinica_id, codigo_paciente),
  CONSTRAINT chk_pacientes_alergias_array CHECK (jsonb_typeof(alergias_json) = 'array'),
  CONSTRAINT chk_pacientes_antecedentes_obj CHECK (jsonb_typeof(antecedentes_json) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_pacientes_clinica_id ON public.pacientes(clinica_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_estado ON public.pacientes(estado);
CREATE INDEX IF NOT EXISTS idx_pacientes_deleted_at ON public.pacientes(deleted_at);

DROP TRIGGER IF EXISTS tr_pacientes_updated_at ON public.pacientes;
CREATE TRIGGER tr_pacientes_updated_at
BEFORE UPDATE ON public.pacientes
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Historia clinica (1 por paciente por clinica)
CREATE TABLE IF NOT EXISTS public.historias_clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  numero_historia TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_historia_paciente UNIQUE (paciente_id),
  CONSTRAINT uq_historia_numero_por_clinica UNIQUE (clinica_id, numero_historia)
);

CREATE INDEX IF NOT EXISTS idx_historias_clinicas_clinica_id ON public.historias_clinicas(clinica_id);

DROP TRIGGER IF EXISTS tr_historias_clinicas_updated_at ON public.historias_clinicas;
CREATE TRIGGER tr_historias_clinicas_updated_at
BEFORE UPDATE ON public.historias_clinicas
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Especialidades y relacion medico-especialidad
CREATE TABLE IF NOT EXISTS public.especialidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  codigo TEXT,
  nombre TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'ACTIVA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_especialidad_clinica_nombre UNIQUE (clinica_id, nombre),
  CONSTRAINT uq_especialidad_clinica_codigo UNIQUE (clinica_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_especialidades_clinica_id ON public.especialidades(clinica_id);

DROP TRIGGER IF EXISTS tr_especialidades_updated_at ON public.especialidades;
CREATE TRIGGER tr_especialidades_updated_at
BEFORE UPDATE ON public.especialidades
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TABLE IF NOT EXISTS public.usuario_especialidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  especialidad_id UUID NOT NULL REFERENCES public.especialidades(id) ON DELETE CASCADE,
  principal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_usuario_especialidad UNIQUE (usuario_id, especialidad_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_especialidad_principal
ON public.usuario_especialidades(usuario_id)
WHERE principal = TRUE;

-- Citas
CREATE TABLE IF NOT EXISTS public.citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE RESTRICT,
  profesional_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  especialidad_id UUID REFERENCES public.especialidades(id) ON DELETE SET NULL,
  estado cita_estado NOT NULL DEFAULT 'PROGRAMADA',
  canal cita_canal NOT NULL DEFAULT 'PRESENCIAL',
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ NOT NULL,
  motivo TEXT,
  observaciones TEXT,
  sala_consultorio TEXT,
  origen TEXT,
  confirmada_at TIMESTAMPTZ,
  cancelada_at TIMESTAMPTZ,
  cancelada_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  cancelacion_motivo TEXT,
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_cita_rango_horario CHECK (fecha_fin > fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_citas_clinica_fecha ON public.citas(clinica_id, fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_citas_profesional_fecha ON public.citas(profesional_id, fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_citas_paciente_fecha ON public.citas(paciente_id, fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON public.citas(estado);

-- Evita doble reserva de profesional en el mismo rango para estados activos.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ex_citas_profesional_rango_activo'
      AND conrelid = 'public.citas'::regclass
  ) THEN
    ALTER TABLE public.citas
      ADD CONSTRAINT ex_citas_profesional_rango_activo
      EXCLUDE USING gist (
        profesional_id WITH =,
        tstzrange(fecha_inicio, fecha_fin, '[)') WITH &&
      )
      WHERE (estado IN ('PROGRAMADA', 'CONFIRMADA', 'EN_CURSO'));
  END IF;
END
$$;

DROP TRIGGER IF EXISTS tr_citas_updated_at ON public.citas;
CREATE TRIGGER tr_citas_updated_at
BEFORE UPDATE ON public.citas
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Atenciones clinicas
CREATE TABLE IF NOT EXISTS public.atenciones_clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  historia_clinica_id UUID NOT NULL REFERENCES public.historias_clinicas(id) ON DELETE CASCADE,
  cita_id UUID REFERENCES public.citas(id) ON DELETE SET NULL,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE RESTRICT,
  profesional_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  especialidad_id UUID REFERENCES public.especialidades(id) ON DELETE SET NULL,
  estado atencion_estado NOT NULL DEFAULT 'ABIERTA',
  fecha_atencion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  motivo_consulta TEXT,
  anamnesis TEXT,
  examen_fisico TEXT,
  evaluacion TEXT,
  plan_tratamiento TEXT,
  recomendaciones TEXT,
  proxima_cita_sugerida_at TIMESTAMPTZ,
  firmado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  firmado_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atenciones_clinica_fecha ON public.atenciones_clinicas(clinica_id, fecha_atencion DESC);
CREATE INDEX IF NOT EXISTS idx_atenciones_historia_fecha ON public.atenciones_clinicas(historia_clinica_id, fecha_atencion DESC);
CREATE INDEX IF NOT EXISTS idx_atenciones_paciente_fecha ON public.atenciones_clinicas(paciente_id, fecha_atencion DESC);
CREATE INDEX IF NOT EXISTS idx_atenciones_profesional_fecha ON public.atenciones_clinicas(profesional_id, fecha_atencion DESC);

DROP TRIGGER IF EXISTS tr_atenciones_clinicas_updated_at ON public.atenciones_clinicas;
CREATE TRIGGER tr_atenciones_clinicas_updated_at
BEFORE UPDATE ON public.atenciones_clinicas
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Signos vitales por atencion
CREATE TABLE IF NOT EXISTS public.atencion_signos_vitales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atencion_id UUID NOT NULL REFERENCES public.atenciones_clinicas(id) ON DELETE CASCADE,
  presion_arterial TEXT,
  frecuencia_cardiaca INTEGER,
  frecuencia_respiratoria INTEGER,
  temperatura NUMERIC(4,1),
  saturacion_oxigeno NUMERIC(5,2),
  peso_kg NUMERIC(6,2),
  talla_cm NUMERIC(6,2),
  imc NUMERIC(6,2),
  glucosa_mg_dl NUMERIC(8,2),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_signos_valores_basicos CHECK (
    (frecuencia_cardiaca IS NULL OR frecuencia_cardiaca > 0) AND
    (frecuencia_respiratoria IS NULL OR frecuencia_respiratoria > 0) AND
    (temperatura IS NULL OR temperatura > 20) AND
    (saturacion_oxigeno IS NULL OR (saturacion_oxigeno >= 0 AND saturacion_oxigeno <= 100)) AND
    (peso_kg IS NULL OR peso_kg > 0) AND
    (talla_cm IS NULL OR talla_cm > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_atencion_signos_vitales_atencion_id ON public.atencion_signos_vitales(atencion_id);

-- Diagnosticos
CREATE TABLE IF NOT EXISTS public.diagnosticos_cie10 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_diagnosticos_cie10_codigo UNIQUE (codigo)
);

CREATE INDEX IF NOT EXISTS idx_diagnosticos_cie10_activo ON public.diagnosticos_cie10(activo);

DROP TRIGGER IF EXISTS tr_diagnosticos_cie10_updated_at ON public.diagnosticos_cie10;
CREATE TRIGGER tr_diagnosticos_cie10_updated_at
BEFORE UPDATE ON public.diagnosticos_cie10
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TABLE IF NOT EXISTS public.atencion_diagnosticos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atencion_id UUID NOT NULL REFERENCES public.atenciones_clinicas(id) ON DELETE CASCADE,
  diagnostico_id UUID NOT NULL REFERENCES public.diagnosticos_cie10(id) ON DELETE RESTRICT,
  es_principal BOOLEAN NOT NULL DEFAULT FALSE,
  tipo TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_atencion_diagnostico UNIQUE (atencion_id, diagnostico_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_atencion_diagnostico_principal
ON public.atencion_diagnosticos(atencion_id)
WHERE es_principal = TRUE;

-- Recetas
CREATE TABLE IF NOT EXISTS public.recetas_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  atencion_id UUID NOT NULL REFERENCES public.atenciones_clinicas(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE RESTRICT,
  profesional_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  codigo TEXT,
  indicaciones_generales TEXT,
  emitida_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_recetas_codigo_por_clinica UNIQUE (clinica_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_recetas_clinica_emitida ON public.recetas_medicas(clinica_id, emitida_at DESC);
CREATE INDEX IF NOT EXISTS idx_recetas_paciente_emitida ON public.recetas_medicas(paciente_id, emitida_at DESC);

DROP TRIGGER IF EXISTS tr_recetas_medicas_updated_at ON public.recetas_medicas;
CREATE TRIGGER tr_recetas_medicas_updated_at
BEFORE UPDATE ON public.recetas_medicas
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TABLE IF NOT EXISTS public.receta_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id UUID NOT NULL REFERENCES public.recetas_medicas(id) ON DELETE CASCADE,
  medicamento TEXT NOT NULL,
  concentracion TEXT,
  forma_farmaceutica TEXT,
  dosis TEXT,
  frecuencia TEXT,
  duracion TEXT,
  via_administracion TEXT,
  cantidad INTEGER,
  indicaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_receta_items_cantidad CHECK (cantidad IS NULL OR cantidad > 0)
);

CREATE INDEX IF NOT EXISTS idx_receta_items_receta_id ON public.receta_items(receta_id);

-- Adjuntos clinicos
CREATE TABLE IF NOT EXISTS public.archivos_clinicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
  atencion_id UUID REFERENCES public.atenciones_clinicas(id) ON DELETE CASCADE,
  historia_clinica_id UUID REFERENCES public.historias_clinicas(id) ON DELETE CASCADE,
  tipo archivo_clinico_tipo NOT NULL DEFAULT 'OTRO',
  nombre_archivo TEXT NOT NULL,
  mime_type TEXT,
  storage_key TEXT NOT NULL,
  tamano_bytes BIGINT,
  checksum_sha256 TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  subido_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_archivo_storage_key UNIQUE (storage_key),
  CONSTRAINT chk_archivos_metadata_obj CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT chk_archivos_tamano CHECK (tamano_bytes IS NULL OR tamano_bytes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_archivos_clinicos_clinica ON public.archivos_clinicos(clinica_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_archivos_clinicos_paciente ON public.archivos_clinicos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_archivos_clinicos_atencion ON public.archivos_clinicos(atencion_id);

-- Semillas minimas
INSERT INTO public.especialidades (clinica_id, codigo, nombre, estado)
SELECT c.id, 'MED-GEN', 'Medicina General', 'ACTIVA'
FROM public.clinicas c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.especialidades e
  WHERE e.clinica_id = c.id
    AND e.nombre = 'Medicina General'
);

COMMIT;
