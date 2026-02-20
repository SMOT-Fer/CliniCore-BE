-- Migration 004: Create personas table
-- Created: 2026-02-20
-- Rationale: Store person records (used by usuarios)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'sexo_tipo'
    ) THEN
        CREATE TYPE sexo_tipo AS ENUM ('MASCULINO', 'FEMENINO');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni CHAR(8) NOT NULL UNIQUE,
    nombres TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT NOT NULL,
    sexo sexo_tipo NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indices para búsquedas
CREATE INDEX IF NOT EXISTS idx_personas_dni ON personas(dni);
CREATE INDEX IF NOT EXISTS idx_personas_nombres ON personas(nombres);
CREATE INDEX IF NOT EXISTS idx_personas_apellido_paterno ON personas(apellido_paterno);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION set_personas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_personas_updated_at ON personas;
CREATE TRIGGER trg_personas_updated_at
BEFORE UPDATE ON personas
FOR EACH ROW
EXECUTE FUNCTION set_personas_updated_at();
