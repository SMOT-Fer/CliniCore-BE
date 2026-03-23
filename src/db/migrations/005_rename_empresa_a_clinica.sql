-- 005_rename_empresa_a_clinica.sql
-- Migracion de nomenclatura: empresa -> clinica (sin perdida de datos)

BEGIN;

-- 1) Tabla principal
DO $$
BEGIN
  IF to_regclass('public.empresas') IS NOT NULL
     AND to_regclass('public.clinicas') IS NULL THEN
    ALTER TABLE public.empresas RENAME TO clinicas;
  END IF;
END
$$;

-- 2) Usuarios: empresa_id -> clinica_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'empresa_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.usuarios RENAME COLUMN empresa_id TO clinica_id;
  END IF;
END
$$;

ALTER INDEX IF EXISTS public.idx_usuarios_empresa_id
  RENAME TO idx_usuarios_clinica_id;

-- 3) Suscripciones: suscripciones_empresa -> suscripciones_clinica
DO $$
BEGIN
  IF to_regclass('public.suscripciones_empresa') IS NOT NULL
     AND to_regclass('public.suscripciones_clinica') IS NULL THEN
    ALTER TABLE public.suscripciones_empresa RENAME TO suscripciones_clinica;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'suscripciones_clinica' AND column_name = 'empresa_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'suscripciones_clinica' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.suscripciones_clinica RENAME COLUMN empresa_id TO clinica_id;
  END IF;
END
$$;

ALTER INDEX IF EXISTS public.idx_suscripciones_empresa_empresa_id
  RENAME TO idx_suscripciones_clinica_clinica_id;

ALTER INDEX IF EXISTS public.idx_suscripciones_empresa_estado
  RENAME TO idx_suscripciones_clinica_estado;

ALTER INDEX IF EXISTS public.idx_suscripciones_empresa_fin
  RENAME TO idx_suscripciones_clinica_fin;

ALTER INDEX IF EXISTS public.uq_suscripcion_activa_por_empresa
  RENAME TO uq_suscripcion_activa_por_clinica;

-- 4) Eventos de suscripcion: empresa_id -> clinica_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'suscripcion_eventos' AND column_name = 'empresa_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'suscripcion_eventos' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.suscripcion_eventos RENAME COLUMN empresa_id TO clinica_id;
  END IF;
END
$$;

ALTER INDEX IF EXISTS public.idx_suscripcion_eventos_empresa_id
  RENAME TO idx_suscripcion_eventos_clinica_id;

-- 5) Uso mensual: empresa_id -> clinica_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'uso_plan_mensual' AND column_name = 'empresa_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'uso_plan_mensual' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.uso_plan_mensual RENAME COLUMN empresa_id TO clinica_id;
  END IF;
END
$$;

ALTER INDEX IF EXISTS public.idx_uso_plan_mensual_empresa_periodo
  RENAME TO idx_uso_plan_mensual_clinica_periodo;

-- 6) FK constraints (renombre semantico)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'suscripciones_empresa_empresa_id_fkey'
      AND conrelid = 'public.suscripciones_clinica'::regclass
  ) THEN
    ALTER TABLE public.suscripciones_clinica
      RENAME CONSTRAINT suscripciones_empresa_empresa_id_fkey TO suscripciones_clinica_clinica_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'suscripcion_eventos_empresa_id_fkey'
      AND conrelid = 'public.suscripcion_eventos'::regclass
  ) THEN
    ALTER TABLE public.suscripcion_eventos
      RENAME CONSTRAINT suscripcion_eventos_empresa_id_fkey TO suscripcion_eventos_clinica_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uso_plan_mensual_empresa_id_fkey'
      AND conrelid = 'public.uso_plan_mensual'::regclass
  ) THEN
    ALTER TABLE public.uso_plan_mensual
      RENAME CONSTRAINT uso_plan_mensual_empresa_id_fkey TO uso_plan_mensual_clinica_id_fkey;
  END IF;
END
$$;

-- 7) Vista de suscripcion vigente
DROP VIEW IF EXISTS public.v_suscripcion_vigente;

CREATE VIEW public.v_suscripcion_vigente AS
SELECT
  sc.id,
  sc.clinica_id,
  sc.plan_id,
  sc.estado,
  sc.periodo_actual_inicio,
  sc.periodo_actual_fin,
  sc.trial_ends_at,
  sc.cancel_at_period_end,
  sc.cancelled_at,
  sc.suspendida_at,
  sc.motivo_suspendida,
  sc.created_by,
  sc.updated_by,
  sc.created_at,
  sc.updated_at,
  p.codigo AS plan_codigo,
  p.nombre AS plan_nombre,
  p.moneda,
  p.precio_mensual,
  p.precio_anual,
  p.max_usuarios,
  p.max_pacientes_activos,
  p.max_storage_gb,
  p.incluye_facturacion_electronica,
  p.incluye_historia_clinica_avanzada,
  p.incluye_integraciones,
  p.incluye_api,
  p.dias_trial
FROM public.suscripciones_clinica sc
JOIN public.planes_saas p ON p.id = sc.plan_id
WHERE sc.estado IN ('TRIAL', 'ACTIVA', 'PAST_DUE')
  AND NOW() <= sc.periodo_actual_fin;

-- 8) Compatibilidad temporal para clientes antiguos (lectura)
-- Nota: mantener solo durante transicion y retirar en una migracion futura.
CREATE OR REPLACE VIEW public.empresas AS
SELECT * FROM public.clinicas;

CREATE OR REPLACE VIEW public.suscripciones_empresa AS
SELECT
  id,
  clinica_id AS empresa_id,
  plan_id,
  estado,
  periodo_actual_inicio,
  periodo_actual_fin,
  trial_ends_at,
  cancel_at_period_end,
  cancelled_at,
  suspendida_at,
  motivo_suspendida,
  created_by,
  updated_by,
  created_at,
  updated_at
FROM public.suscripciones_clinica;

COMMIT;
