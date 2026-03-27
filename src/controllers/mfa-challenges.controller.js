const MfaChallengesModel = require('../models/mfa-challenges.model');

class MfaChallengesController {
  static async crearDesafio(req, res) {
    try {
      const { usuario_id, factor_id } = req.body;

      const desafio = await MfaChallengesModel.crear({ usuarioId: usuario_id, factorId: factor_id });

      return res.status(201).json({
        success: true,
        message: 'Desafío MFA creado. Se ha enviado un código.',
        data: {
          desafio_id: desafio.id,
          intentos_restantes: desafio.intentos_restantes,
          expira_en: desafio.expira_en,
        },
      });
    } catch (error) {
      console.error('Error creating mfa challenge:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async responderDesafio(req, res) {
    try {
      const { usuario_id, desafio_id, codigo } = req.body;

      const desafio = await MfaChallengesModel.obtenerPorId({ desafioId: desafio_id });

      if (!desafio) {
        return res.status(404).json({ success: false, error: 'Desafío no encontrado o expirado' });
      }

      if (desafio.usuario_id.toString() !== usuario_id.toString()) {
        return res.status(403).json({ success: false, error: 'Desafío no pertenece a este usuario' });
      }

      if (desafio.resuelto) {
        return res.status(400).json({ success: false, error: 'Desafío ya ha sido resuelto' });
      }

      if (desafio.intentos_restantes <= 0) {
        return res.status(429).json({ success: false, error: 'Máximo de intentos excedido' });
      }

      // Validar código
      if (desafio.codigo_desafio !== codigo) {
        const actualizado = await MfaChallengesModel.decrementarIntentos({ desafioId: desafio_id });

        if (actualizado.intentos_restantes <= 0) {
          return res.status(429).json({ success: false, error: 'Máximo de intentos excedido' });
        }

        return res.status(400).json({
          success: false,
          error: 'Código inválido',
          intentos_restantes: actualizado.intentos_restantes,
        });
      }

      // Marcar como resuelto
      const resuelto = await MfaChallengesModel.marcarResuelto({ desafioId: desafio_id });

      return res.status(200).json({
        success: true,
        message: 'Desafío MFA verificado correctamente',
        data: resuelto,
      });
    } catch (error) {
      console.error('Error responding to mfa challenge:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async limpiar(req, res) {
    try {
      const deletedCount = await MfaChallengesModel.limpiarExpirados();

      return res.status(200).json({
        success: true,
        message: `${deletedCount} desafíos MFA expirados limpiados`,
        cleaned: deletedCount,
      });
    } catch (error) {
      console.error('Error cleaning mfa challenges:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}

module.exports = MfaChallengesController;
