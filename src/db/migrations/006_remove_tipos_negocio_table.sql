-- 006_remove_tipos_negocio_table.sql
-- Limpieza: eliminar tabla tipos_negocio y unificar a clinica general
-- Diseñado para ser idempotente y seguro en despliegues repetidos.

BEGIN;

DO $$
DECLARE
  v_entity_table text;
  v_has_tipo_col boolean;
  v_generic_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_constraint_name text;
BEGIN
  -- Detecta el nombre de la tabla principal segun estado de migracion.
  IF to_regclass('public.clinicas') IS NOT NULL THEN
    v_entity_table := 'clinicas';
  ELSIF to_regclass('public.empresas') IS NOT NULL THEN
    v_entity_table := 'empresas';
  ELSE
    v_entity_table := NULL;
  END IF;

  IF v_entity_table IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = v_entity_table
        AND column_name = 'tipo_negocio_id'
    ) INTO v_has_tipo_col;

    IF v_has_tipo_col THEN
      -- Si existe tabla legacy, inserta registro general para asegurar trazabilidad.
      IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'tipos_negocio'
          AND c.relkind = 'r'
      ) THEN
        EXECUTE $sql$
          INSERT INTO public.tipos_negocio (id, codigo, nombre)
          VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'GENERAL', 'Clinica general')
          ON CONFLICT (id) DO NOTHING
        $sql$;
      END IF;

      -- Todas las clinicas pasan a tipo general (mantiene compatibilidad con codigo heredado).
      EXECUTE format(
        'UPDATE public.%I SET tipo_negocio_id = $1 WHERE tipo_negocio_id IS DISTINCT FROM $1',
        v_entity_table
      ) USING v_generic_id;

      -- Elimina FK hacia tipos_negocio para permitir retirar la tabla.
      FOR v_constraint_name IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = v_entity_table
          AND con.contype = 'f'
          AND con.confrelid = to_regclass('public.tipos_negocio')
      LOOP
        EXECUTE format(
          'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
          v_entity_table,
          v_constraint_name
        );
      END LOOP;
    END IF;
  END IF;

  -- Convierte tipos_negocio a vista readonly con un unico registro general.
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'tipos_negocio'
      AND c.relkind = 'r'
  ) THEN
    EXECUTE 'DROP TABLE public.tipos_negocio';
  ELSIF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'tipos_negocio'
      AND c.relkind IN ('v', 'm')
  ) THEN
    EXECUTE 'DROP VIEW public.tipos_negocio';
  END IF;

  EXECUTE $view$
    CREATE OR REPLACE VIEW public.tipos_negocio AS
    SELECT
      '00000000-0000-0000-0000-000000000001'::uuid AS id,
      'GENERAL'::text AS codigo,
      'Clinica general'::text AS nombre,
      NOW()::timestamptz AS created_at,
      NOW()::timestamptz AS updated_at
  $view$;
END $$;

COMMIT;
