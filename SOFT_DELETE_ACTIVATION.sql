-- SOFT_DELETE_ACTIVATION.sql
-- Ejecutar este script en tu PostgreSQL si ya tienes datos en la BD
-- Agrega soporte de soft delete a todas las tablas principales

BEGIN;

-- 1. Agregar columnas de soft delete a clinicas
ALTER TABLE clinicas 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- 2. Agregar columnas de soft delete a usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- 3. Agregar columnas de soft delete a personas
ALTER TABLE personas 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- 4. Agregar columnas de soft delete a refresh_tokens
ALTER TABLE refresh_tokens 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Crear índices para queries rápidas de soft delete
CREATE INDEX IF NOT EXISTS idx_clinicas_deleted_at ON clinicas(deleted_at);
CREATE INDEX IF NOT EXISTS idx_usuarios_deleted_at ON usuarios(deleted_at);
CREATE INDEX IF NOT EXISTS idx_personas_deleted_at ON personas(deleted_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_deleted_at ON refresh_tokens(deleted_at);

-- Constraints para garantizar integridad (deleted_by solo cuando deleted_at existe)
ALTER TABLE clinicas
ADD CONSTRAINT check_clinicas_deleted
CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL))
NOT VALID;

ALTER TABLE usuarios
ADD CONSTRAINT check_usuarios_deleted
CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL))
NOT VALID;

ALTER TABLE personas
ADD CONSTRAINT check_personas_deleted
CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL))
NOT VALID;

COMMIT;

-- Verificación: ejecuta esto después
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'usuarios' 
-- AND column_name IN ('deleted_at', 'deleted_by');
