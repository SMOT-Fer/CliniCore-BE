-- Migration 005: Add soft deletes to personas
-- Created: 2026-02-20
-- Rationale: Healthcare compliance (audit trail)

ALTER TABLE personas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- Indices para soft delete queries
CREATE INDEX IF NOT EXISTS idx_personas_deleted_at ON personas(deleted_at);

-- Constraints: deleted_by solo con deleted_at
ALTER TABLE personas
ADD CONSTRAINT check_personas_deleted
CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL));

-- Trigger para auditoría
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (usuario_id, tabla_nombre, operacion, registro_id, datos_antes, datos_despues)
    VALUES (
        COALESCE(current_setting('app.user_id', true)::UUID, NULL),
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE row_to_json(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_personas ON personas;
CREATE TRIGGER trg_audit_personas
AFTER INSERT OR UPDATE OR DELETE ON personas
FOR EACH ROW
EXECUTE FUNCTION log_audit();
