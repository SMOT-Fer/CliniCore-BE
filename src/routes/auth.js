const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { authLimiter } = require('../middlewares/rate-limit');
const { validateBody } = require('../middlewares/validate-body');
const Joi = require('joi');

// Schemas de validación
const schemaRegistro = Joi.object({
  dni: Joi.string().pattern(/^\d{8}$/).required().messages({
    'string.pattern.base': 'El DNI debe tener exactamente 8 dígitos',
    'any.required': 'El DNI es obligatorio'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'El email no es válido',
    'any.required': 'El email es obligatorio'
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'any.required': 'La contraseña es obligatoria'
  })
});

const schemaSolicitarRecuperacion = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'El email no es válido',
    'any.required': 'El email es obligatorio'
  })
});

const schemaVerificarCodigo = Joi.object({
  email: Joi.string().email().required(),
  codigo: Joi.string().length(6).pattern(/^[A-Za-z0-9]+$/).required().messages({
    'string.length': 'El código debe tener 6 caracteres',
    'string.pattern.base': 'El código solo puede contener letras y números'
  })
});

const schemaRestablecerPassword = Joi.object({
  email: Joi.string().email().required(),
  codigo: Joi.string().length(6).pattern(/^[A-Za-z0-9]+$/).required(),
  nueva_password: Joi.string().min(8).required().messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'any.required': 'La nueva contraseña es obligatoria'
  })
});

// Rutas públicas (con rate limiting)
router.post('/registro', authLimiter, validateBody(schemaRegistro), AuthController.registro);
router.post('/solicitar-recuperacion', authLimiter, validateBody(schemaSolicitarRecuperacion), AuthController.solicitarRecuperacion);
router.post('/verificar-codigo', authLimiter, validateBody(schemaVerificarCodigo), AuthController.verificarCodigo);
router.post('/restablecer-password', authLimiter, validateBody(schemaRestablecerPassword), AuthController.restablecerPassword);

// Google OAuth
router.get('/google', AuthController.googleRedirect);
router.get('/google/callback', AuthController.googleCallback);

module.exports = router;
