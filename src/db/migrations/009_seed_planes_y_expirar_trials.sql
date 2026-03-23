INSERT INTO public.planes_saas (
  codigo,
  nombre,
  descripcion,
  moneda,
  precio_mensual,
  precio_anual,
  max_usuarios,
  max_pacientes_activos,
  max_storage_gb,
  incluye_facturacion_electronica,
  incluye_historia_clinica_avanzada,
  incluye_integraciones,
  incluye_api,
  dias_trial,
  estado
)
VALUES
  (
    'TRIAL_CLINICA',
    'Prueba 14 dias',
    'Plan de prueba por 14 dias para clinicas nuevas. Al vencer queda sin suscripcion activa.',
    'PEN',
    0,
    0,
    5,
    500,
    10,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    14,
    'ACTIVO'
  ),
  (
    'BASIC_CLINICA',
    'Basic',
    'Plan basico para consultorios y clinicas pequenas.',
    'PEN',
    149,
    1490,
    15,
    5000,
    100,
    TRUE,
    FALSE,
    FALSE,
    FALSE,
    0,
    'ACTIVO'
  ),
  (
    'PRO_CLINICA',
    'Pro',
    'Plan profesional para clinicas en crecimiento.',
    'PEN',
    399,
    3990,
    60,
    30000,
    500,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    0,
    'ACTIVO'
  ),
  (
    'ENTERPRISE_CLINICA',
    'Enterprise',
    'Plan enterprise para redes clinicas o grupos con mayor demanda.',
    'PEN',
    999,
    9990,
    NULL,
    NULL,
    NULL,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    0,
    'ACTIVO'
  )
ON CONFLICT (codigo) DO UPDATE
SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  moneda = EXCLUDED.moneda,
  precio_mensual = EXCLUDED.precio_mensual,
  precio_anual = EXCLUDED.precio_anual,
  max_usuarios = EXCLUDED.max_usuarios,
  max_pacientes_activos = EXCLUDED.max_pacientes_activos,
  max_storage_gb = EXCLUDED.max_storage_gb,
  incluye_facturacion_electronica = EXCLUDED.incluye_facturacion_electronica,
  incluye_historia_clinica_avanzada = EXCLUDED.incluye_historia_clinica_avanzada,
  incluye_integraciones = EXCLUDED.incluye_integraciones,
  incluye_api = EXCLUDED.incluye_api,
  dias_trial = EXCLUDED.dias_trial,
  estado = EXCLUDED.estado,
  updated_at = NOW();

CREATE OR REPLACE FUNCTION public.fn_expirar_trials_vencidos(p_clinica_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total INTEGER := 0;
BEGIN
  WITH trials_vencidos AS (
    SELECT
      sc.id,
      sc.clinica_id,
      sc.estado AS estado_anterior
    FROM public.suscripciones_clinica sc
    WHERE sc.estado = 'TRIAL'
      AND COALESCE(sc.trial_ends_at, sc.periodo_actual_fin) <= NOW()
      AND (p_clinica_id IS NULL OR sc.clinica_id = p_clinica_id)
    FOR UPDATE
  ), actualizadas AS (
    UPDATE public.suscripciones_clinica sc
    SET
      estado = 'EXPIRADA',
      updated_at = NOW()
    FROM trials_vencidos tv
    WHERE sc.id = tv.id
    RETURNING sc.id, sc.clinica_id, tv.estado_anterior
  ), eventos AS (
    INSERT INTO public.suscripcion_eventos (
      suscripcion_id,
      clinica_id,
      evento,
      estado_anterior,
      estado_nuevo,
      metadata,
      created_by
    )
    SELECT
      a.id,
      a.clinica_id,
      'TRIAL_EXPIRADO',
      a.estado_anterior,
      'EXPIRADA'::suscripcion_estado,
      jsonb_build_object(
        'motivo', 'trial_vencido',
        'expirado_automaticamente', TRUE,
        'fecha_proceso', NOW()
      ),
      NULL
    FROM actualizadas a
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_total FROM actualizadas;

  RETURN v_total;
END;
$$;
