const WebhookEventosPagoModel = require('../models/webhook-eventos-pago.model');
const PagosClinicaModel = require('../models/pagos-clinica.model');

const mapWebhookError = (error) => {
  if (error?.code === '23503') return { status: 409, message: 'Clínica no existe' };
  if (error?.code === '22P02') return { status: 400, message: 'ID de evento inválido' };
  return { status: 500, message: 'Error interno del servidor' };
};

class WebhookEventosPagoController {
  static async listar(req, res) {
    try {
      const { clinicaId } = req.body;
      const filter = req.query;

      const eventos = await WebhookEventosPagoModel.listarPorClinica({ clinicaId, filter });

      return res.status(200).json({
        success: true,
        data: eventos,
      });
    } catch (error) {
      console.error('Error listing webhook eventos:', error);
      const { status, message } = mapWebhookError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async obtener(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const evento = await WebhookEventosPagoModel.obtenerPorId({ clinicaId, eventoId: id });

      if (!evento) {
        return res.status(404).json({ success: false, error: 'Evento no encontrado' });
      }

      return res.status(200).json({
        success: true,
        data: evento,
      });
    } catch (error) {
      console.error('Error fetching webhook evento:', error);
      const { status, message } = mapWebhookError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  // Webhook endpoint para recibir eventos de proveedores (sin auth required)
  static async recibirEvento(req, res) {
    try {
      const { clinicaId } = req.body;
      const payload = req.body.payload;

      const evento = await WebhookEventosPagoModel.crear({ clinicaId, payload });

      // Procesar evento de forma asíncrona
      setImmediate(async () => {
        try {
          await WebhookEventosPagoController.procesarEvento(evento);
        } catch (err) {
          console.error('Error processing webhook evento:', err);
          await WebhookEventosPagoModel.marcarError({ clinicaId, eventoId: evento.id, errorMsg: err.message });
        }
      });

      return res.status(202).json({
        success: true,
        message: 'Evento recibido y encolado para procesamiento',
        event_id: evento.id,
      });
    } catch (error) {
      console.error('Error receiving webhook evento:', error);
      const { status, message } = mapWebhookError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }

  static async procesarEvento(evento) {
    const { id: eventoId, clinica_id: clinicaId, evento_tipo, referencia_externa, payload_evento } = evento;

    try {
      // Determinar acción basada en tipo de evento
      if (['payment.succeeded', 'charge.completed', 'payment_intent.succeeded'].includes(evento_tipo)) {
        // Marcar pago como completado
        const pago = await PagosClinicaModel.obtenerPorReferencia({ referencia_externa });
        if (pago) {
          await PagosClinicaModel.marcarCompletado({ clinicaId, pagoId: pago.id });
        }
      } else if (['payment.failed', 'charge.failed', 'payment_intent.payment_failed', 'invoice.payment_failed'].includes(evento_tipo)) {
        // Marcar pago como rechazado
        const pago = await PagosClinicaModel.obtenerPorReferencia({ referencia_externa });
        if (pago) {
          const motivo = payload_evento?.error?.message || 'Pago rechazado por proveedor';
          await PagosClinicaModel.marcarRechazado({ clinicaId, pagoId: pago.id, errorMsg: motivo });
        }
      } else if (evento_tipo === 'charge.refunded') {
        // Procesar reembolso
        const pago = await PagosClinicaModel.obtenerPorReferencia({ referencia_externa });
        if (pago) {
          await PagosClinicaModel.actualizar({
            clinicaId,
            pagoId: pago.id,
            payload: {
              estado: 'REEMBOLSADO',
              detalles: { reembolso_en: new Date(), razon: payload_evento?.reason || 'Sin especificar' },
            },
          });
        }
      }

      // Marcar evento como procesado
      await WebhookEventosPagoModel.marcarProcesado({ clinicaId, eventoId });
    } catch (err) {
      throw new Error(`Error al procesar evento ${evento_tipo}: ${err.message}`);
    }
  }

  static async marcarProcesado(req, res) {
    try {
      const { clinicaId } = req.body;
      const { id } = req.params;

      const evento = await WebhookEventosPagoModel.marcarProcesado({ clinicaId, eventoId: id });

      if (!evento) {
        return res.status(404).json({ success: false, error: 'Evento no encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Evento marcado como procesado',
        data: evento,
      });
    } catch (error) {
      console.error('Error marking webhook evento procesado:', error);
      const { status, message } = mapWebhookError(error);
      return res.status(status).json({ success: false, error: message });
    }
  }
}

module.exports = WebhookEventosPagoController;
