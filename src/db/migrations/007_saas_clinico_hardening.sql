-- 007_saas_clinico_hardening.sql
-- Hardening de base de datos para SaaS clinico profesional.
-- Requiere haber ejecutado 005 y 006.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_provider') THEN
    CREATE TYPE billing_provider AS ENUM ('STRIPE', 'MERCADOPAGO', 'IZIPAY', 'NIUBIZ', 'MANUAL');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_estado') THEN
    CREATE TYPE invoice_estado AS ENUM ('BORRADOR', 'EMITIDA', 'PAGADA', 'VENCIDA', 'ANULADA');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_estado') THEN
    CREATE TYPE payment_estado AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'REEMBOLSADO', 'CANCELADO');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integracion_estado') THEN
    CREATE TYPE integracion_estado AS ENUM ('ACTIVA', 'INACTIVA', 'ERROR');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webhook_estado') THEN
    CREATE TYPE webhook_estado AS ENUM ('PENDIENTE', 'PROCESADO', 'ERROR');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mfa_factor_tipo') THEN
    CREATE TYPE mfa_factor_tipo AS ENUM ('TOTP', 'EMAIL_OTP');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outbox_estado') THEN
    CREATE TYPE outbox_estado AS ENUM ('PENDIENTE', 'PROCESANDO', 'PROCESADO', 'ERROR', 'DESCARTADO');
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

-- Configuracion por clinica
CREATE TABLE IF NOT EXISTS public.clinica_configuracion (
  clinica_id UUID PRIMARY KEY REFERENCES public.clinicas(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'America/Lima',
  locale TEXT NOT NULL DEFAULT 'es-PE',
  moneda CHAR(3) NOT NULL DEFAULT 'PEN',
  logo_url TEXT,
  color_primario TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_clinica_config_moneda_len CHECK (char_length(moneda) = 3),
  CONSTRAINT chk_clinica_config_json_obj CHECK (jsonb_typeof(config) = 'object')
);

CREATE TABLE IF NOT EXISTS public.clinica_dominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  dominio CITEXT NOT NULL,
  es_principal BOOLEAN NOT NULL DEFAULT FALSE,
  verificado BOOLEAN NOT NULL DEFAULT FALSE,
  token_verificacion TEXT,
  verificado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_clinica_dominios_dominio UNIQUE (dominio)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_clinica_dominio_principal
ON public.clinica_dominios (clinica_id)
WHERE es_principal = TRUE;

CREATE TABLE IF NOT EXISTS public.clinica_integraciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  proveedor TEXT NOT NULL,
  estado integracion_estado NOT NULL DEFAULT 'INACTIVA',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ultima_sincronizacion_at TIMESTAMPTZ,
  ultimo_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_clinica_integracion UNIQUE (clinica_id, proveedor),
  CONSTRAINT chk_clinica_integraciones_config_obj CHECK (jsonb_typeof(config) = 'object')
);

-- Facturacion y pagos
CREATE TABLE IF NOT EXISTS public.facturas_clinica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE RESTRICT,
  suscripcion_id UUID REFERENCES public.suscripciones_clinica(id) ON DELETE SET NULL,
  codigo TEXT NOT NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'PEN',
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  impuesto NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado invoice_estado NOT NULL DEFAULT 'BORRADOR',
  emitida_at TIMESTAMPTZ,
  vence_at TIMESTAMPTZ,
  pagada_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_facturas_clinica_codigo UNIQUE (codigo),
  CONSTRAINT chk_factura_periodo_valido CHECK (periodo_fin >= periodo_inicio),
  CONSTRAINT chk_factura_montos_validos CHECK (subtotal >= 0 AND impuesto >= 0 AND total >= 0),
  CONSTRAINT chk_factura_moneda_len CHECK (char_length(moneda) = 3),
  CONSTRAINT chk_factura_metadata_obj CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_facturas_clinica_clinica_id ON public.facturas_clinica(clinica_id);
CREATE INDEX IF NOT EXISTS idx_facturas_clinica_estado ON public.facturas_clinica(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_clinica_periodo ON public.facturas_clinica(periodo_inicio, periodo_fin);

CREATE TABLE IF NOT EXISTS public.factura_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES public.facturas_clinica(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_factura_item_valores CHECK (cantidad > 0 AND precio_unitario >= 0 AND subtotal >= 0),
  CONSTRAINT chk_factura_item_metadata_obj CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_factura_items_factura_id ON public.factura_items(factura_id);

CREATE TABLE IF NOT EXISTS public.metodos_pago_clinica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  provider billing_provider NOT NULL,
  token_ref TEXT,
  titular TEXT,
  marca TEXT,
  last4 CHAR(4),
  exp_month INTEGER,
  exp_year INTEGER,
  es_predeterminado BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_metodo_pago_token_ref UNIQUE (token_ref),
  CONSTRAINT chk_metodo_pago_last4 CHECK (last4 IS NULL OR last4 ~ '^[0-9]{4}$'),
  CONSTRAINT chk_metodo_pago_exp_month CHECK (exp_month IS NULL OR (exp_month BETWEEN 1 AND 12)),
  CONSTRAINT chk_metodo_pago_exp_year CHECK (exp_year IS NULL OR exp_year >= 2000),
  CONSTRAINT chk_metodo_pago_metadata_obj CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_metodo_pago_predeterminado
ON public.metodos_pago_clinica(clinica_id)
WHERE es_predeterminado = TRUE;

CREATE TABLE IF NOT EXISTS public.pagos_clinica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE RESTRICT,
  factura_id UUID REFERENCES public.facturas_clinica(id) ON DELETE SET NULL,
  metodo_pago_id UUID REFERENCES public.metodos_pago_clinica(id) ON DELETE SET NULL,
  provider billing_provider NOT NULL,
  external_payment_id TEXT,
  estado payment_estado NOT NULL DEFAULT 'PENDIENTE',
  monto NUMERIC(12,2) NOT NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'PEN',
  pagado_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pago_external UNIQUE (provider, external_payment_id),
  CONSTRAINT chk_pago_monto_pos CHECK (monto > 0),
  CONSTRAINT chk_pago_moneda_len CHECK (char_length(moneda) = 3),
  CONSTRAINT chk_pago_raw_payload_obj CHECK (jsonb_typeof(raw_payload) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_pagos_clinica_clinica_id ON public.pagos_clinica(clinica_id);
CREATE INDEX IF NOT EXISTS idx_pagos_clinica_estado ON public.pagos_clinica(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_clinica_created_at ON public.pagos_clinica(created_at DESC);

CREATE TABLE IF NOT EXISTS public.webhook_eventos_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider billing_provider NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  estado webhook_estado NOT NULL DEFAULT 'PENDIENTE',
  payload JSONB NOT NULL,
  procesado_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_webhook_evento_provider_event UNIQUE (provider, event_id),
  CONSTRAINT chk_webhook_payload_obj CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_webhook_eventos_pago_estado ON public.webhook_eventos_pago(estado);
CREATE INDEX IF NOT EXISTS idx_webhook_eventos_pago_created_at ON public.webhook_eventos_pago(created_at DESC);

-- Seguridad y acceso
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  prefijo TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_api_keys_prefijo UNIQUE (prefijo),
  CONSTRAINT uq_api_keys_hash UNIQUE (key_hash),
  CONSTRAINT chk_api_keys_scopes_arr CHECK (jsonb_typeof(scopes) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_api_keys_clinica_id ON public.api_keys(clinica_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_revoked_at ON public.api_keys(revoked_at);

CREATE TABLE IF NOT EXISTS public.intentos_login (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
  email CITEXT,
  ip INET,
  user_agent TEXT,
  exito BOOLEAN NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intentos_login_email_created ON public.intentos_login(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intentos_login_ip_created ON public.intentos_login(ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intentos_login_usuario_created ON public.intentos_login(usuario_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_password_reset_exp CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_usuario_id ON public.password_reset_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON public.password_reset_tokens(expires_at);

CREATE TABLE IF NOT EXISTS public.mfa_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo mfa_factor_tipo NOT NULL,
  secreto_encriptado TEXT,
  destino TEXT,
  verificado_at TIMESTAMPTZ,
  es_primario BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_mfa_usuario_tipo UNIQUE (usuario_id, tipo)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mfa_factor_primario
ON public.mfa_factors(usuario_id)
WHERE es_primario = TRUE;

CREATE TABLE IF NOT EXISTS public.mfa_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_id UUID NOT NULL REFERENCES public.mfa_factors(id) ON DELETE CASCADE,
  codigo_hash TEXT NOT NULL,
  expira_at TIMESTAMPTZ NOT NULL,
  consumido_at TIMESTAMPTZ,
  intentos INTEGER NOT NULL DEFAULT 0,
  max_intentos INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_mfa_challenge_intentos CHECK (intentos >= 0 AND max_intentos > 0)
);

CREATE INDEX IF NOT EXISTS idx_mfa_challenges_factor_id ON public.mfa_challenges(factor_id);
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_expira_at ON public.mfa_challenges(expira_at);

CREATE TABLE IF NOT EXISTS public.invitaciones_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  email CITEXT NOT NULL,
  rol rol_usuario NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expira_at TIMESTAMPTZ NOT NULL,
  aceptada_at TIMESTAMPTZ,
  invitado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_invitacion_expira CHECK (expira_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_invitaciones_clinica_id ON public.invitaciones_usuario(clinica_id);
CREATE INDEX IF NOT EXISTS idx_invitaciones_email ON public.invitaciones_usuario(email);

-- Operaciones/eventos para procesamiento asincrono
CREATE TABLE IF NOT EXISTS public.outbox_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  key TEXT,
  payload JSONB NOT NULL,
  estado outbox_estado NOT NULL DEFAULT 'PENDIENTE',
  intentos INTEGER NOT NULL DEFAULT 0,
  max_intentos INTEGER NOT NULL DEFAULT 20,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT chk_outbox_payload_obj CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT chk_outbox_intentos CHECK (intentos >= 0 AND max_intentos > 0)
);

CREATE INDEX IF NOT EXISTS idx_outbox_estado_next_retry ON public.outbox_eventos(estado, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_outbox_topic_created_at ON public.outbox_eventos(topic, created_at DESC);

-- Auditoria extendida (si existe audit_log, la endurece)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID,
  tabla_nombre TEXT NOT NULL,
  operacion TEXT NOT NULL,
  registro_id UUID,
  datos_antes JSONB,
  datos_despues JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.audit_log
  ADD COLUMN IF NOT EXISTS clinica_id UUID,
  ADD COLUMN IF NOT EXISTS request_id TEXT,
  ADD COLUMN IF NOT EXISTS ip INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS modulo TEXT,
  ADD COLUMN IF NOT EXISTS severidad TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_audit_log_clinica_id ON public.audit_log(clinica_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_request_id ON public.audit_log(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_modulo_created ON public.audit_log(modulo, created_at DESC);

-- Triggers updated_at
DROP TRIGGER IF EXISTS tr_clinica_configuracion_updated_at ON public.clinica_configuracion;
CREATE TRIGGER tr_clinica_configuracion_updated_at
BEFORE UPDATE ON public.clinica_configuracion
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS tr_clinica_dominios_updated_at ON public.clinica_dominios;
CREATE TRIGGER tr_clinica_dominios_updated_at
BEFORE UPDATE ON public.clinica_dominios
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS tr_clinica_integraciones_updated_at ON public.clinica_integraciones;
CREATE TRIGGER tr_clinica_integraciones_updated_at
BEFORE UPDATE ON public.clinica_integraciones
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS tr_facturas_clinica_updated_at ON public.facturas_clinica;
CREATE TRIGGER tr_facturas_clinica_updated_at
BEFORE UPDATE ON public.facturas_clinica
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS tr_metodos_pago_clinica_updated_at ON public.metodos_pago_clinica;
CREATE TRIGGER tr_metodos_pago_clinica_updated_at
BEFORE UPDATE ON public.metodos_pago_clinica
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS tr_pagos_clinica_updated_at ON public.pagos_clinica;
CREATE TRIGGER tr_pagos_clinica_updated_at
BEFORE UPDATE ON public.pagos_clinica
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS tr_webhook_eventos_pago_updated_at ON public.webhook_eventos_pago;
CREATE TRIGGER tr_webhook_eventos_pago_updated_at
BEFORE UPDATE ON public.webhook_eventos_pago
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS tr_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER tr_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS tr_mfa_factors_updated_at ON public.mfa_factors;
CREATE TRIGGER tr_mfa_factors_updated_at
BEFORE UPDATE ON public.mfa_factors
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS tr_outbox_eventos_updated_at ON public.outbox_eventos;
CREATE TRIGGER tr_outbox_eventos_updated_at
BEFORE UPDATE ON public.outbox_eventos
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Tabla/objeto legado de tipos_negocio puede existir como vista readonly por migracion 006.
-- Asegura consistencia final: un unico tipo general para clientes legacy de solo lectura.
CREATE OR REPLACE VIEW public.tipos_negocio AS
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid AS id,
  'GENERAL'::text AS codigo,
  'Clinica general'::text AS nombre,
  NOW()::timestamptz AS created_at,
  NOW()::timestamptz AS updated_at;

COMMIT;
