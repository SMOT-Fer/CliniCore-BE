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

CREATE TABLE IF NOT EXISTS planes_saas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  moneda CHAR(3) NOT NULL DEFAULT 'PEN',
  precio_mensual NUMERIC(10, 2) NOT NULL DEFAULT 0,
  precio_anual NUMERIC(10, 2) NOT NULL DEFAULT 0,
  max_usuarios INTEGER,
  max_pacientes_activos INTEGER,
  max_storage_gb INTEGER,
  incluye_facturacion_electronica BOOLEAN NOT NULL DEFAULT FALSE,
  incluye_historia_clinica_avanzada BOOLEAN NOT NULL DEFAULT FALSE,
  incluye_integraciones BOOLEAN NOT NULL DEFAULT FALSE,
  incluye_api BOOLEAN NOT NULL DEFAULT FALSE,
  dias_trial INTEGER NOT NULL DEFAULT 0,
  estado plan_estado NOT NULL DEFAULT 'ACTIVO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'suscripciones_empresa'
      AND c.relkind = 'r'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'suscripciones_empresa' AND column_name = 'empresa_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_suscripciones_empresa_empresa_id ON suscripciones_empresa(empresa_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_suscripcion_activa_por_empresa
      ON suscripciones_empresa (empresa_id)
      WHERE estado IN ('TRIAL', 'ACTIVA', 'PAST_DUE');
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'suscripciones_empresa' AND column_name = 'clinica_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_suscripciones_empresa_clinica_id ON suscripciones_empresa(clinica_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_suscripcion_activa_por_clinica
      ON suscripciones_empresa (clinica_id)
      WHERE estado IN ('TRIAL', 'ACTIVA', 'PAST_DUE');
    END IF;

    CREATE INDEX IF NOT EXISTS idx_suscripciones_empresa_estado ON suscripciones_empresa(estado);
    CREATE INDEX IF NOT EXISTS idx_suscripciones_empresa_fin ON suscripciones_empresa(periodo_actual_fin);
  END IF;
END
$$;

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
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'suscripcion_eventos' AND column_name = 'empresa_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_suscripcion_eventos_empresa_id ON suscripcion_eventos(empresa_id);
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'suscripcion_eventos' AND column_name = 'clinica_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_suscripcion_eventos_clinica_id ON suscripcion_eventos(clinica_id);
  END IF;
END
$$;
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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'uso_plan_mensual' AND column_name = 'empresa_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_uso_plan_mensual_empresa_periodo ON uso_plan_mensual(empresa_id, periodo_yyyymm DESC);
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'uso_plan_mensual' AND column_name = 'clinica_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_uso_plan_mensual_clinica_periodo ON uso_plan_mensual(clinica_id, periodo_yyyymm DESC);
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.v_suscripcion_vigente') IS NULL THEN
    EXECUTE $view$
      CREATE VIEW v_suscripcion_vigente AS
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
        AND NOW() <= se.periodo_actual_fin
    $view$;
  END IF;
END
$$;

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
SELECT *
FROM (
  VALUES
    ('TRIAL_CLINICA', 'Trial Clínica', 'Plan de evaluación para clínicas nuevas', 'PEN', 0::NUMERIC, 0::NUMERIC, 5, 500, 10, FALSE, FALSE, FALSE, FALSE, 14, 'ACTIVO'::plan_estado),
    ('BASIC_CLINICA', 'Clínica Basic', 'Plan básico para consultorios y clínicas pequeñas', 'PEN', 149::NUMERIC, 1490::NUMERIC, 15, 5000, 100, TRUE, FALSE, FALSE, FALSE, 0, 'ACTIVO'::plan_estado),
    ('PRO_CLINICA', 'Clínica Pro', 'Plan profesional para clínicas en crecimiento', 'PEN', 399::NUMERIC, 3990::NUMERIC, 60, 30000, 500, TRUE, TRUE, TRUE, FALSE, 0, 'ACTIVO'::plan_estado),
    ('ENTERPRISE_CLINICA', 'Clínica Enterprise', 'Plan enterprise para redes clínicas', 'PEN', 999::NUMERIC, 9990::NUMERIC, NULL, NULL, NULL, TRUE, TRUE, TRUE, TRUE, 0, 'ACTIVO'::plan_estado)
) AS seed(
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
WHERE NOT EXISTS (
  SELECT 1 FROM planes_saas p WHERE p.codigo = seed.codigo
);
