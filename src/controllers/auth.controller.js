const crypto = require('crypto');
const UsuariosModel = require('../models/usuarios.model');
const PersonasModel = require('../models/personas.model');
const RefreshTokensModel = require('../models/refresh_tokens.model');
const PasswordResetCodesModel = require('../models/password_reset_codes.model');
const { obtenerPersonaPorDni } = require('../utils/perudevs');
const { hashPassword, comparePassword } = require('../utils/password');
const { generarAccessToken, generarRefreshToken } = require('../utils/jwt');
const { hashToken } = require('../utils/token-hash');
const { enviarCodigoRecuperacion, enviarConfirmacionCambioPassword, enviarBienvenida } = require('../utils/mailer');

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
};

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function normalizarEmail(email) {
  return String(email).trim().toUpperCase();
}

function validarPasswordEstricto(password) {
  return PASSWORD_REGEX.test(String(password));
}

class AuthController {
  /**
   * POST /api/auth/registro
   * Registro público con DNI (obtiene datos de perudevs)
   */
  static async registro(req, res) {
    try {
      const { dni, email, password } = req.body;

      if (!dni || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'DNI, email y contraseña son obligatorios'
        });
      }

      const dniLimpio = String(dni).trim();
      if (!/^\d{8}$/.test(dniLimpio)) {
        return res.status(400).json({
          success: false,
          error: 'El DNI debe tener exactamente 8 dígitos'
        });
      }

      const emailNormalizado = normalizarEmail(email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'El email no es válido'
        });
      }

      if (!validarPasswordEstricto(password)) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula y número'
        });
      }

      // Verificar si el email ya existe
      const emailExiste = await UsuariosModel.existeEmail(emailNormalizado);
      if (emailExiste) {
        return res.status(409).json({
          success: false,
          error: 'El email ya está registrado'
        });
      }

      // Buscar o crear persona con datos de perudevs
      let persona = await PersonasModel.obtenerPorDni(dniLimpio);

      if (!persona) {
        // Consultar API de perudevs
        const datosPerudevs = await obtenerPersonaPorDni(dniLimpio);

        if (!datosPerudevs) {
          return res.status(404).json({
            success: false,
            error: 'No se encontró información para el DNI ingresado. Verifica que sea correcto.'
          });
        }

        persona = await PersonasModel.crear({
          dni: dniLimpio,
          nombres: datosPerudevs.nombres,
          apellido_paterno: datosPerudevs.apellido_paterno,
          apellido_materno: datosPerudevs.apellido_materno,
          sexo: datosPerudevs.sexo,
          fecha_nacimiento: datosPerudevs.fecha_nacimiento
        });
      } else {
        // Verificar si la persona ya tiene usuario
        const tieneUsuario = await UsuariosModel.existePersona(persona.id);
        if (tieneUsuario) {
          return res.status(409).json({
            success: false,
            error: 'Ya existe una cuenta asociada a este DNI'
          });
        }
      }

      // Crear usuario (sin clínica asignada, será STAFF por defecto)
      const passwordHash = await hashPassword(password);
      const nuevoUsuario = await UsuariosModel.crear({
        persona_id: persona.id,
        clinica_id: null, // Sin clínica asignada inicialmente
        email: emailNormalizado,
        password_hash: passwordHash,
        rol: 'STAFF', // Rol por defecto
        estado: 'ACTIVO'
      });

      // Enviar email de bienvenida
      try {
        await enviarBienvenida(email, persona.nombres);
      } catch (emailError) {
        console.warn('No se pudo enviar email de bienvenida:', emailError.message);
      }

      return res.status(201).json({
        success: true,
        data: {
          id: nuevoUsuario.id,
          email: nuevoUsuario.email,
          nombres: persona.nombres,
          apellido_paterno: persona.apellido_paterno,
          apellido_materno: persona.apellido_materno
        },
        message: 'Cuenta creada exitosamente. Ahora puedes iniciar sesión.'
      });
    } catch (error) {
      console.error('Error en registro:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * POST /api/auth/solicitar-recuperacion
   * Envía código de recuperación al email
   */
  static async solicitarRecuperacion(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'El email es obligatorio'
        });
      }

      const emailNormalizado = normalizarEmail(email);

      // Buscar usuario por email
      const usuario = await UsuariosModel.obtenerPorEmailConPassword(emailNormalizado);

      // Por seguridad, siempre respondemos igual aunque el usuario no exista
      if (!usuario) {
        // Respuesta genérica para evitar enumerar usuarios
        return res.json({
          success: true,
          message: 'Si el email está registrado, recibirás un código de recuperación.'
        });
      }

      // Generar y guardar código
      const resetCode = await PasswordResetCodesModel.crear(emailNormalizado);

      // Enviar email con código
      try {
        await enviarCodigoRecuperacion(email, resetCode.codigo);
      } catch (emailError) {
        console.error('Error al enviar email de recuperación:', emailError);
        return res.status(500).json({
          success: false,
          error: 'No se pudo enviar el código. Intenta nuevamente.'
        });
      }

      return res.json({
        success: true,
        message: 'Si el email está registrado, recibirás un código de recuperación.'
      });
    } catch (error) {
      console.error('Error en solicitar recuperación:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * POST /api/auth/verificar-codigo
   * Verifica si el código es válido
   */
  static async verificarCodigo(req, res) {
    try {
      const { email, codigo } = req.body;

      if (!email || !codigo) {
        return res.status(400).json({
          success: false,
          error: 'Email y código son obligatorios'
        });
      }

      const emailNormalizado = normalizarEmail(email);
      const codigoLimpio = String(codigo).trim().toUpperCase();

      if (!/^[A-Z0-9]{6}$/.test(codigoLimpio)) {
        return res.status(400).json({
          success: false,
          error: 'El código debe tener 6 caracteres alfanuméricos'
        });
      }

      const codigoValido = await PasswordResetCodesModel.verificar(emailNormalizado, codigoLimpio);

      if (!codigoValido) {
        return res.status(400).json({
          success: false,
          error: 'Código inválido o expirado'
        });
      }

      return res.json({
        success: true,
        message: 'Código verificado correctamente'
      });
    } catch (error) {
      console.error('Error en verificar código:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * POST /api/auth/restablecer-password
   * Restablece la contraseña con código válido
   */
  static async restablecerPassword(req, res) {
    try {
      const { email, codigo, nueva_password } = req.body;

      if (!email || !codigo || !nueva_password) {
        return res.status(400).json({
          success: false,
          error: 'Email, código y nueva contraseña son obligatorios'
        });
      }

      if (!validarPasswordEstricto(nueva_password)) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula y número'
        });
      }

      const emailNormalizado = normalizarEmail(email);
      const codigoLimpio = String(codigo).trim().toUpperCase();

      // Verificar código
      const codigoValido = await PasswordResetCodesModel.verificar(emailNormalizado, codigoLimpio);

      if (!codigoValido) {
        return res.status(400).json({
          success: false,
          error: 'Código inválido o expirado'
        });
      }

      // Buscar usuario
      const usuario = await UsuariosModel.obtenerPorEmailConPassword(emailNormalizado);

      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      // Actualizar contraseña
      const passwordHash = await hashPassword(nueva_password);
      await UsuariosModel.actualizar(usuario.id, { password_hash: passwordHash });

      // Marcar código como usado
      await PasswordResetCodesModel.marcarUsado(codigoValido.id);

      // Revocar todas las sesiones activas del usuario
      await RefreshTokensModel.revocarActivosPorUsuario(usuario.id);

      // Enviar confirmación
      try {
        await enviarConfirmacionCambioPassword(email);
      } catch (emailError) {
        console.warn('No se pudo enviar confirmación de cambio:', emailError.message);
      }

      return res.json({
        success: true,
        message: 'Contraseña actualizada correctamente. Puedes iniciar sesión.'
      });
    } catch (error) {
      console.error('Error en restablecer password:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * GET /api/auth/google
   * Inicia el flujo de OAuth con Google
   */
  static async googleRedirect(req, res) {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3001'}/api/auth/google/callback`;

      if (!clientId) {
        return res.status(500).json({
          success: false,
          error: 'Google OAuth no está configurado'
        });
      }

      const scope = encodeURIComponent('openid email profile');
      const state = crypto.randomBytes(16).toString('hex');

      // Guardar state en cookie para validar el callback
      res.cookie('oauth_state', state, {
        ...COOKIE_OPTIONS,
        maxAge: 10 * 60 * 1000 // 10 minutos
      });

      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${scope}` +
        `&state=${state}` +
        `&access_type=offline` +
        `&prompt=select_account`;

      return res.redirect(googleAuthUrl);
    } catch (error) {
      console.error('Error en Google redirect:', error);
      return res.status(500).json({
        success: false,
        error: 'Error al iniciar autenticación con Google'
      });
    }
  }

  /**
   * GET /api/auth/google/callback
   * Callback de Google OAuth
   */
  static async googleCallback(req, res) {
    try {
      const { code, state } = req.query;
      const savedState = req.cookies?.oauth_state;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

      // Validar state para prevenir CSRF
      if (!state || state !== savedState) {
        return res.redirect(`${frontendUrl}/login?error=invalid_state`);
      }

      // Limpiar cookie de state
      res.clearCookie('oauth_state');

      if (!code) {
        return res.redirect(`${frontendUrl}/login?error=no_code`);
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${frontendUrl}/api/auth/google/callback`;

      if (!clientId || !clientSecret) {
        return res.redirect(`${frontendUrl}/login?error=config_error`);
      }

      // Intercambiar código por tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.access_token) {
        console.error('Error obteniendo token de Google:', tokenData);
        return res.redirect(`${frontendUrl}/login?error=token_error`);
      }

      // Obtener información del usuario de Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      const googleUser = await userInfoResponse.json();

      if (!userInfoResponse.ok || !googleUser.email) {
        console.error('Error obteniendo info de usuario:', googleUser);
        return res.redirect(`${frontendUrl}/login?error=user_info_error`);
      }

      const emailNormalizado = normalizarEmail(googleUser.email);

      // Buscar usuario existente
      let usuario = await UsuariosModel.obtenerPorEmailConPassword(emailNormalizado);

      if (!usuario) {
        // Usuario no existe, redirigir a registro
        // Guardamos datos de Google en cookie temporal para pre-llenar registro
        res.cookie('google_pending', JSON.stringify({
          email: googleUser.email,
          nombre: googleUser.given_name || '',
          apellido: googleUser.family_name || '',
          picture: googleUser.picture || ''
        }), {
          ...COOKIE_OPTIONS,
          maxAge: 10 * 60 * 1000 // 10 minutos
        });

        return res.redirect(`${frontendUrl}/login?registro=true&from=google`);
      }

      // Usuario existe, crear sesión
      if (usuario.estado !== 'ACTIVO') {
        return res.redirect(`${frontendUrl}/login?error=cuenta_inactiva`);
      }

      // Actualizar último login
      await UsuariosModel.actualizarUltimoLogin(usuario.id);

      // Generar tokens
      const contextoEmpresa = await UsuariosModel.obtenerContextoEmpresa(usuario.id);
      const accessToken = generarAccessToken({
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        clinica_id: usuario.clinica_id
      });

      const refreshToken = generarRefreshToken({ id: usuario.id });
      const refreshTokenHash = hashToken(refreshToken);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await RefreshTokensModel.crear({
        usuario_id: usuario.id,
        token_hash: refreshTokenHash,
        expires_at: expiresAt
      });

      // Establecer cookies
      res.cookie('access_token', accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000
      });

      res.cookie('refresh_token', refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      // Construir redirect path
      let redirectPath = '/';
      if (usuario.rol === 'SUPERADMIN') {
        redirectPath = '/superadmin-dashboard';
      } else if (contextoEmpresa?.id) {
        const nombreSlug = String(contextoEmpresa.nombre || contextoEmpresa.id)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');
        redirectPath = `/clinica/${nombreSlug}`;
      }

      return res.redirect(`${frontendUrl}${redirectPath}`);
    } catch (error) {
      console.error('Error en Google callback:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      return res.redirect(`${frontendUrl}/login?error=server_error`);
    }
  }
}

module.exports = AuthController;
