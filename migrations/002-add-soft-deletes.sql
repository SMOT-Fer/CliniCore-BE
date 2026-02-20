-- Migration 002: Add soft deletes support
-- Created: 2026-02-19
-- Rationale: Healthcare compliance (audit trail)

ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS deleted_by UUID;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS deleted_by UUID;

ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Indices para soft delete queries
CREATE INDEX IF NOT EXISTS idx_clinicas_deleted_at ON clinicas(deleted_at);
CREATE INDEX IF NOT EXISTS idx_usuarios_deleted_at ON usuarios(deleted_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_deleted_at ON refresh_tokens(deleted_at);

-- Constraints: deleted_by debe venir con deleted_at
ALTER TABLE clinicas
ADD CONSTRAINT check_clinicas_deleted
CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL));

ALTER TABLE usuarios
ADD CONSTRAINT check_usuarios_deleted
CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL));
