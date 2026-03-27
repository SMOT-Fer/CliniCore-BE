-- 010_enable_tipos_negocio_crud.sql
-- Reactiva el catalogo tipos_negocio como tabla editable.
-- Conserva el registro GENERAL legado para compatibilidad.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'tipos_negocio'
      AND c.relkind IN ('v', 'm')
  ) THEN
    DROP VIEW public.tipos_negocio;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tipos_negocio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tipos_negocio_codigo UNIQUE (codigo)
);

CREATE OR REPLACE FUNCTION public.fn_tipos_negocio_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_tipos_negocio_set_updated_at ON public.tipos_negocio;
CREATE TRIGGER tr_tipos_negocio_set_updated_at
BEFORE UPDATE ON public.tipos_negocio
FOR EACH ROW EXECUTE FUNCTION public.fn_tipos_negocio_set_updated_at();

INSERT INTO public.tipos_negocio (id, codigo, nombre)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'GENERAL',
  'Clinica general'
)
ON CONFLICT (id) DO NOTHING;

-- Si no existe relacion FK en clinicas, la crea para proteger integridad del catalogo.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clinicas_tipo_negocio_id_fkey'
      AND conrelid = to_regclass('public.clinicas')
  ) THEN
    ALTER TABLE public.clinicas
      ADD CONSTRAINT clinicas_tipo_negocio_id_fkey
      FOREIGN KEY (tipo_negocio_id) REFERENCES public.tipos_negocio(id);
  END IF;
END $$;

COMMIT;
