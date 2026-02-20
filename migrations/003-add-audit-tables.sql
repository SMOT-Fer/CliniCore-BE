-- Migration 003: Add audit trail tables
-- Created: 2026-02-19
-- Rationale: Track who changed what, when, why

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID,
    tabla_nombre VARCHAR(100) NOT NULL,
    operacion VARCHAR(20) NOT NULL CHECK (operacion IN ('CREATE', 'UPDATE', 'DELETE')),
    registro_id UUID NOT NULL,
    datos_antes JSONB,
    datos_despues JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_audit_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
);

-- Indices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario_id ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tabla_nombre ON audit_log(tabla_nombre);
CREATE INDEX IF NOT EXISTS idx_audit_log_registro_id ON audit_log(registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_operacion ON audit_log(operacion);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- Función para registrar cambios automáticamente
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

-- Triggers para tablas principales
DROP TRIGGER IF EXISTS trg_audit_clinicas ON clinicas;
CREATE TRIGGER trg_audit_clinicas
AFTER INSERT OR UPDATE OR DELETE ON clinicas
FOR EACH ROW
EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS trg_audit_usuarios ON usuarios;
CREATE TRIGGER trg_audit_usuarios
AFTER INSERT OR UPDATE OR DELETE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION log_audit();
