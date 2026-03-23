CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sexo_enum') THEN
    CREATE TYPE sexo_enum AS ENUM ('MASCULINO', 'FEMENINO');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_usuario') THEN
    CREATE TYPE rol_usuario AS ENUM ('SUPERADMIN', 'ADMIN', 'DOCTOR', 'STAFF');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS tipos_negocio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  ruc VARCHAR(11),
  estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
  direccion VARCHAR(255),
  telefono VARCHAR(20),
  tipo_negocio_id UUID NOT NULL REFERENCES tipos_negocio(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  CONSTRAINT uq_empresas_ruc UNIQUE (ruc)
);

CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dni CHAR(8) NOT NULL UNIQUE,
  nombres TEXT NOT NULL,
  apellido_paterno TEXT NOT NULL,
  apellido_materno TEXT NOT NULL,
  sexo sexo_enum NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id),
  persona_id UUID NOT NULL REFERENCES personas(id),
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  rol rol_usuario NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  ultimo_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  CONSTRAINT uq_usuarios_email UNIQUE (email)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'usuarios'
      AND column_name = 'empresa_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_id ON usuarios(empresa_id);
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'usuarios'
      AND column_name = 'clinica_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_usuarios_clinica_id ON usuarios(clinica_id);
  END IF;
END
$$;
CREATE INDEX IF NOT EXISTS idx_usuarios_persona_id ON usuarios(persona_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario_id ON refresh_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID,
  tabla_nombre TEXT NOT NULL,
  operacion TEXT NOT NULL,
  registro_id UUID,
  datos_antes JSONB,
  datos_despues JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tabla ON audit_log(tabla_nombre);
CREATE INDEX IF NOT EXISTS idx_audit_log_operacion ON audit_log(operacion);
CREATE INDEX IF NOT EXISTS idx_audit_log_registro ON audit_log(registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'tipos_negocio'
      AND c.relkind = 'r'
  ) THEN
    INSERT INTO tipos_negocio (codigo, nombre)
    SELECT 'CLINICA', 'Clinica'
    WHERE NOT EXISTS (
      SELECT 1 FROM tipos_negocio WHERE UPPER(codigo) = 'CLINICA'
    );
  END IF;
END
$$;
