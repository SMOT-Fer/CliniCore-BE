CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_estado') THEN
    CREATE TYPE plan_estado AS ENUM ('ACTIVO', 'INACTIVO');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'suscripcion_estado') THEN
    CREATE TYPE suscripcion_estado AS ENUM ('TRIAL', 'ACTIVA', 'PAST_DUE', 'SUSPENDIDA', 'CANCELADA', 'EXPIRADA');
  END IF;
END
$$;

ALTER TABLE IF EXISTS personas
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE IF EXISTS tipos_negocio
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE IF EXISTS tipos_negocio
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS empresas
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID;

ALTER TABLE IF EXISTS usuarios
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ultimo_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID;

ALTER TABLE IF EXISTS refresh_tokens
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS planes_saas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE planes_saas
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS nombre TEXT,
  ADD COLUMN IF NOT EXISTS descripcion TEXT,
  ADD COLUMN IF NOT EXISTS moneda CHAR(3) NOT NULL DEFAULT 'PEN',
  ADD COLUMN IF NOT EXISTS precio_mensual NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_anual NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_usuarios INTEGER,
  ADD COLUMN IF NOT EXISTS max_pacientes_activos INTEGER,
  ADD COLUMN IF NOT EXISTS max_storage_gb INTEGER,
  ADD COLUMN IF NOT EXISTS incluye_facturacion_electronica BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS incluye_historia_clinica_avanzada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS incluye_integraciones BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS incluye_api BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dias_trial INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado plan_estado NOT NULL DEFAULT 'ACTIVO',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE planes_saas
SET codigo = CONCAT('PLAN_', LEFT(id::text, 8))
WHERE codigo IS NULL;

UPDATE planes_saas
SET nombre = COALESCE(nombre, codigo)
WHERE nombre IS NULL;

ALTER TABLE planes_saas
  ALTER COLUMN codigo SET NOT NULL,
  ALTER COLUMN nombre SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_planes_saas_codigo'
      AND conrelid = 'planes_saas'::regclass
  ) THEN
    ALTER TABLE planes_saas ADD CONSTRAINT uq_planes_saas_codigo UNIQUE (codigo);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_planes_saas_estado ON planes_saas(estado);

CREATE TABLE IF NOT EXISTS suscripciones_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES planes_saas(id),
  estado suscripcion_estado NOT NULL,
  periodo_actual_inicio TIMESTAMPTZ NOT NULL,
  periodo_actual_fin TIMESTAMPTZ NOT NULL,
  trial_ends_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  suspendida_at TIMESTAMPTZ,
  motivo_suspendida TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_periodo_suscripcion_valido CHECK (periodo_actual_fin > periodo_actual_inicio)
);

CREATE INDEX IF NOT EXISTS idx_suscripciones_empresa_empresa_id ON suscripciones_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_empresa_estado ON suscripciones_empresa(estado);
CREATE INDEX IF NOT EXISTS idx_suscripciones_empresa_fin ON suscripciones_empresa(periodo_actual_fin);

CREATE UNIQUE INDEX IF NOT EXISTS uq_suscripcion_activa_por_empresa
ON suscripciones_empresa (empresa_id)
WHERE estado IN ('TRIAL', 'ACTIVA', 'PAST_DUE');

CREATE TABLE IF NOT EXISTS suscripcion_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suscripcion_id UUID NOT NULL REFERENCES suscripciones_empresa(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  evento TEXT NOT NULL,
  estado_anterior suscripcion_estado,
  estado_nuevo suscripcion_estado,
  metadata JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suscripcion_eventos_suscripcion_id ON suscripcion_eventos(suscripcion_id);
CREATE INDEX IF NOT EXISTS idx_suscripcion_eventos_empresa_id ON suscripcion_eventos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_suscripcion_eventos_created_at ON suscripcion_eventos(created_at DESC);

CREATE TABLE IF NOT EXISTS uso_plan_mensual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  periodo_yyyymm CHAR(6) NOT NULL,
  usuarios_activos INTEGER NOT NULL DEFAULT 0,
  pacientes_activos INTEGER NOT NULL DEFAULT 0,
  storage_gb NUMERIC(8, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_uso_plan_mensual UNIQUE (empresa_id, periodo_yyyymm)
);

CREATE INDEX IF NOT EXISTS idx_uso_plan_mensual_empresa_periodo ON uso_plan_mensual(empresa_id, periodo_yyyymm DESC);

INSERT INTO planes_saas (
  codigo,
  nombre,
  descripcion,
  moneda,
  precio_mensual,
  precio_anual,
  max_usuarios,
  max_pacientes_activos,
  max_storage_gb,
  incluye_facturacion_electronica,
  incluye_historia_clinica_avanzada,
  incluye_integraciones,
  incluye_api,
  dias_trial,
  estado
)
VALUES
  ('TRIAL_CLINICA', 'Trial Clínica', 'Plan de evaluación para clínicas nuevas', 'PEN', 0, 0, 5, 500, 10, FALSE, FALSE, FALSE, FALSE, 14, 'ACTIVO'),
  ('BASIC_CLINICA', 'Clínica Basic', 'Plan básico para clínicas pequeñas', 'PEN', 149, 1490, 15, 5000, 100, TRUE, FALSE, FALSE, FALSE, 0, 'ACTIVO'),
  ('PRO_CLINICA', 'Clínica Pro', 'Plan profesional para clínicas en crecimiento', 'PEN', 399, 3990, 60, 30000, 500, TRUE, TRUE, TRUE, FALSE, 0, 'ACTIVO'),
  ('ENTERPRISE_CLINICA', 'Clínica Enterprise', 'Plan enterprise para redes clínicas', 'PEN', 999, 9990, NULL, NULL, NULL, TRUE, TRUE, TRUE, TRUE, 0, 'ACTIVO')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  moneda = EXCLUDED.moneda,
  precio_mensual = EXCLUDED.precio_mensual,
  precio_anual = EXCLUDED.precio_anual,
  max_usuarios = EXCLUDED.max_usuarios,
  max_pacientes_activos = EXCLUDED.max_pacientes_activos,
  max_storage_gb = EXCLUDED.max_storage_gb,
  incluye_facturacion_electronica = EXCLUDED.incluye_facturacion_electronica,
  incluye_historia_clinica_avanzada = EXCLUDED.incluye_historia_clinica_avanzada,
  incluye_integraciones = EXCLUDED.incluye_integraciones,
  incluye_api = EXCLUDED.incluye_api,
  dias_trial = EXCLUDED.dias_trial,
  estado = EXCLUDED.estado,
  updated_at = NOW();

CREATE OR REPLACE VIEW v_suscripcion_vigente AS
SELECT
  se.id AS suscripcion_id,
  se.empresa_id,
  se.plan_id,
  se.estado AS suscripcion_estado,
  se.periodo_actual_inicio,
  se.periodo_actual_fin,
  se.trial_ends_at,
  p.codigo AS plan_codigo,
  p.nombre AS plan_nombre,
  p.precio_mensual,
  p.precio_anual,
  p.moneda,
  p.max_usuarios,
  p.max_pacientes_activos,
  p.max_storage_gb,
  p.incluye_facturacion_electronica,
  p.incluye_historia_clinica_avanzada,
  p.incluye_integraciones,
  p.incluye_api
FROM suscripciones_empresa se
JOIN planes_saas p ON p.id = se.plan_id
WHERE se.estado IN ('TRIAL', 'ACTIVA', 'PAST_DUE')
  AND NOW() <= se.periodo_actual_fin;

INSERT INTO suscripciones_empresa (
  empresa_id,
  plan_id,
  estado,
  periodo_actual_inicio,
  periodo_actual_fin,
  trial_ends_at,
  created_at,
  updated_at
)
SELECT
  e.id,
  p.id,
  'TRIAL',
  NOW(),
  NOW() + INTERVAL '14 days',
  NOW() + INTERVAL '14 days',
  NOW(),
  NOW()
FROM empresas e
JOIN planes_saas p ON p.codigo = 'TRIAL_CLINICA'
WHERE e.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM suscripciones_empresa se
    WHERE se.empresa_id = e.id
      AND se.estado IN ('TRIAL', 'ACTIVA', 'PAST_DUE')
      AND NOW() <= se.periodo_actual_fin
  );
