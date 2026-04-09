-- Tabla para códigos de recuperación de contraseña
-- Ejecutar en la base de datos PostgreSQL

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  code_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsqueda por email
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email ON password_reset_codes(email);

-- Índice para limpieza de códigos expirados
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires_at ON password_reset_codes(expires_at);

-- Comentarios
COMMENT ON TABLE password_reset_codes IS 'Almacena códigos de recuperación de contraseña';
COMMENT ON COLUMN password_reset_codes.email IS 'Email del usuario (normalizado a mayúsculas)';
COMMENT ON COLUMN password_reset_codes.code_hash IS 'Hash SHA-256 del código de 6 caracteres';
COMMENT ON COLUMN password_reset_codes.expires_at IS 'Fecha de expiración del código (15 minutos desde creación)';
COMMENT ON COLUMN password_reset_codes.used_at IS 'Fecha en que se usó el código (NULL si no usado)';
