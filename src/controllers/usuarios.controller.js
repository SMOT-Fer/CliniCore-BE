const crypto = require('crypto');
const UsuariosModel = require('../models/usuarios.model');
const RefreshTokensModel = require('../models/refresh_tokens.model');
const { hashPassword, comparePassword } = require('../utils/password');
const { generarAccessToken, generarRefreshToken, verificarRefreshToken } = require('../utils/jwt');
const { hashToken } = require('../utils/token-hash');
const SuscripcionesModel = require('../models/suscripciones.model');

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
};

const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
};

const ROLES_VALIDOS = new Set(['ADMIN', 'DOCTOR', 'STAFF', 'SUPERADMIN']);
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function normalizarEmail(email) {
  return String(email).trim().toUpperCase();
}

function validarPasswordEstricto(password) {
  return PASSWORD_REGEX.test(String(password));
}

function generarCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

function asegurarCsrfCookie(req, res) {
  if (!req.cookies?.csrf_token) {
    res.cookie('csrf_token', generarCsrfToken(), CSRF_COOKIE_OPTIONS);
  }
}

function obtenerEmpresaId(input = {}) {
  return input.clinica_id ?? input.empresa_id ?? null;
}

function toSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function construirRedirectPath(usuario, contextoEmpresa) {
  if (usuario?.rol === 'SUPERADMIN') return '/superadmin-dashboard';
  if (!contextoEmpresa?.id) return null;

  const nombreSlug = toSlug(contextoEmpresa.nombre || contextoEmpresa.id);
  return `/clinica/${nombreSlug}`;
}

class UsuariosController {
  static async miSesion(req, res) {
    try {
      asegurarCsrfCookie(req, res);
      const usuario = await UsuariosModel.obtenerPorId(req.user.id);

      if (!usuario) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      const contextoEmpresa = await UsuariosModel.obtenerContextoEmpresa(usuario.id);
      const redirectPath = construirRedirectPath(usuario, contextoEmpresa);

      if (!redirectPath) {
        return res.status(403).json({ success: false, error: 'Usuario sin clinica asignada o sin ruta de acceso valida' });
      }

      const clinica = contextoEmpresa ? {
        id: contextoEmpresa.id,
        nombre: contextoEmpresa.nombre,
        estado: contextoEmpresa.estado,
        tipo_negocio_id: contextoEmpresa.tipo_negocio_id,
        tipo_negocio_codigo: contextoEmpresa.tipo_negocio_codigo,
        tipo_negocio_nombre: contextoEmpresa.tipo_negocio_nombre
      } : null;

      return res.json({
        success: true,
        data: {
          ...usuario,
          clinica,
          empresa: clinica,
          redirect_path: redirectPath
        }
      });
    } catch (error) {
      console.error('Error al validar sesión:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async obtenerTodos(req, res) {
    try {
      const usuarios = await UsuariosModel.obtenerTodos();
      const empresaIdUsuario = req.user?.clinica_id ?? req.user?.empresa_id;

      if (req.user?.rol === 'ADMIN') {
        const propios = usuarios.filter(u => u.clinica_id === empresaIdUsuario);
        return res.json({ success: true, data: propios, count: propios.length });
      }

      res.json({ success: true, data: usuarios, count: usuarios.length });
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async obtenerPorId(req, res) {
    try {
      const { id } = req.params;
      const usuario = await UsuariosModel.obtenerPorId(id);

      if (!usuario) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      const empresaIdUsuario = req.user?.clinica_id ?? req.user?.empresa_id;
      if (req.user?.rol === 'ADMIN' && usuario.clinica_id !== empresaIdUsuario) {
        return res.status(403).json({ success: false, error: 'No autorizado para este usuario' });
      }

      if ((req.user?.rol === 'DOCTOR' || req.user?.rol === 'STAFF') && req.user.id !== usuario.id) {
        return res.status(403).json({ success: false, error: 'Solo puedes ver tu propio usuario' });
      }

      res.json({ success: true, data: usuario });
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async crear(req, res) {
    try {
      const clinica_id = obtenerEmpresaId(req.body);
      const { persona_id, email, password, rol, estado } = req.body;

      if (!persona_id || !email || !password || !rol) {
        return res.status(400).json({ success: false, error: 'Faltan campos requeridos: persona_id, email, password, rol' });
      }

      if (!validarPasswordEstricto(password)) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña debe tener al menos 8 caracteres, con mayúsculas, minúsculas y números'
        });
      }

      if (!ROLES_VALIDOS.has(rol)) {
        return res.status(400).json({ success: false, error: 'Rol inválido' });
      }

      if (rol === 'SUPERADMIN') {
        return res.status(403).json({ success: false, error: 'No está permitido crear usuarios SUPERADMIN desde este módulo' });
      }

      if (rol !== 'SUPERADMIN' && !clinica_id) {
        return res.status(400).json({ success: false, error: 'clinica_id es obligatorio para roles ADMIN, DOCTOR y STAFF' });
      }

      if (rol !== 'SUPERADMIN') {
        const cupo = await SuscripcionesModel.validarCupoUsuarios(clinica_id);
        if (!cupo.permitido) {
          if (cupo.razon === 'SIN_SUSCRIPCION') {
            return res.status(402).json({
              success: false,
              error: 'La clínica no tiene una suscripción activa',
              code: 'SUSCRIPCION_REQUERIDA'
            });
          }

          return res.status(409).json({
            success: false,
            error: 'Se alcanzó el límite de usuarios activos del plan',
            code: 'LIMITE_PLAN_USUARIOS',
            data: {
              limite: cupo.limite,
              usados: cupo.usados
            }
          });
        }
      }

      if (req.user?.rol === 'ADMIN') {
        // SuperAdmin puede crear ADMINs sin validar suscripción
        // ADMIN solo puede crear si hay suscripción (y solo DOCTOR/STAFF en su propia clínica)
        if (rol !== 'SUPERADMIN' && req.user?.rol !== 'SUPERADMIN') {
          const cupo = await SuscripcionesModel.validarCupoUsuarios(clinica_id);
          if (!cupo.permitido) {
            if (cupo.razon === 'SIN_SUSCRIPCION') {
              return res.status(402).json({
                success: false,
                error: 'La clínica no tiene una suscripción activa',
                code: 'SUSCRIPCION_REQUERIDA'
              });
            }

            return res.status(409).json({
              success: false,
              error: 'Se alcanzó el límite de usuarios activos del plan',
              code: 'LIMITE_PLAN_USUARIOS',
              data: {
                limite: cupo.limite,
                usados: cupo.usados
              }
            });
          }
        }

        if (req.user?.rol === 'ADMIN') {
          const empresaIdUsuario = req.user?.clinica_id ?? req.user?.empresa_id;
          if (rol === 'SUPERADMIN' || rol === 'ADMIN') {
            return res.status(403).json({ success: false, error: 'ADMIN no puede crear usuarios ADMIN o SUPERADMIN' });
          }

          if (clinica_id !== empresaIdUsuario) {
            return res.status(403).json({ success: false, error: 'ADMIN solo puede crear usuarios en su empresa' });
          }
      }

        }

        const emailNormalizado = normalizarEmail(email);
      const existeEmail = await UsuariosModel.existeEmail(emailNormalizado);
      if (existeEmail) {
        return res.status(409).json({ success: false, error: 'El email ya existe en la base de datos' });
      }

      const existePersona = await UsuariosModel.existePersona(persona_id);
      if (existePersona) {
        return res.status(409).json({ success: false, error: 'La persona ya tiene un usuario asociado' });
      }

      const passwordHash = await hashPassword(password);

      const usuario = await UsuariosModel.crear({
        clinica_id: rol === 'SUPERADMIN' ? null : clinica_id,
        persona_id,
        email: emailNormalizado,
        password_hash: passwordHash,
        rol,
        estado: estado || 'ACTIVO'
      });

      res.status(201).json({ success: true, data: usuario });
    } catch (error) {
      console.error('Error al crear usuario:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async actualizar(req, res) {
    try {
      const { id } = req.params;
      const usuarioActual = await UsuariosModel.obtenerPorIdIncluyendoEliminados(id);

      if (!usuarioActual) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      if (req.user?.rol === 'ADMIN') {
        const empresaIdUsuario = req.user?.clinica_id ?? req.user?.empresa_id;
        if (usuarioActual.clinica_id !== empresaIdUsuario) {
          return res.status(403).json({ success: false, error: 'ADMIN solo puede editar usuarios de su empresa' });
        }
      }

      const tieneAlgunCampo = Object.values(req.body).some(value => value !== undefined);
      if (!tieneAlgunCampo) {
        return res.status(400).json({ success: false, error: 'Debe proporcionar al menos un campo para actualizar' });
      }

      if (req.body.rol !== undefined && !ROLES_VALIDOS.has(req.body.rol)) {
        return res.status(400).json({ success: false, error: 'Rol inválido' });
      }

      if (req.body.rol === 'SUPERADMIN') {
        return res.status(403).json({ success: false, error: 'No está permitido asignar rol SUPERADMIN desde este módulo' });
      }

      if (req.user?.rol === 'ADMIN') {
        const rolObjetivo = req.body.rol || usuarioActual.rol;
        if (rolObjetivo === 'SUPERADMIN' || rolObjetivo === 'ADMIN') {
          return res.status(403).json({ success: false, error: 'ADMIN no puede asignar rol ADMIN o SUPERADMIN' });
        }
      }

      if (req.body.email && normalizarEmail(req.body.email) !== usuarioActual.email) {
        const existeEmail = await UsuariosModel.existeEmail(normalizarEmail(req.body.email));
        if (existeEmail) {
          return res.status(409).json({ success: false, error: 'El email ya existe en la base de datos' });
        }
      }

      const clinica_id = obtenerEmpresaId(req.body);

      const payload = {
        clinica_id,
        persona_id: req.body.persona_id,
        email: req.body.email ? normalizarEmail(req.body.email) : undefined,
        rol: req.body.rol,
        estado: req.body.estado
      };

      const rolFinal = req.body.rol || usuarioActual.rol;
      const empresaFinal = clinica_id !== null && clinica_id !== undefined ? clinica_id : usuarioActual.clinica_id;

      if (req.user?.rol === 'ADMIN') {
        const empresaIdUsuario = req.user?.clinica_id ?? req.user?.empresa_id;
        if (empresaFinal !== empresaIdUsuario) {
          return res.status(403).json({ success: false, error: 'ADMIN no puede mover usuarios fuera de su empresa' });
        }
      }

      if (rolFinal === 'SUPERADMIN') {
        payload.clinica_id = null;
      } else if (!empresaFinal) {
        return res.status(400).json({ success: false, error: 'clinica_id es obligatorio para roles ADMIN, DOCTOR y STAFF' });
      }

      if (req.body.password !== undefined) {
        if (!validarPasswordEstricto(req.body.password)) {
          return res.status(400).json({
            success: false,
            error: 'La contraseña debe tener al menos 8 caracteres, con mayúsculas, minúsculas y números'
          });
        }

        payload.password_hash = await hashPassword(req.body.password);
      }

      const usuario = await UsuariosModel.actualizar(id, payload);
      res.json({ success: true, data: usuario });
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async eliminar(req, res) {
    try {
      const { id } = req.params;
      const usuario = await UsuariosModel.obtenerPorIdIncluyendoEliminados(id);

      if (!usuario) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      if (req.user?.rol === 'ADMIN') {
        const empresaIdUsuario = req.user?.clinica_id ?? req.user?.empresa_id;
        if (usuario.clinica_id !== empresaIdUsuario) {
          return res.status(403).json({ success: false, error: 'ADMIN solo puede eliminar usuarios de su empresa' });
        }

        if (usuario.rol === 'ADMIN' || usuario.rol === 'SUPERADMIN') {
          return res.status(403).json({ success: false, error: 'ADMIN no puede eliminar usuarios ADMIN o SUPERADMIN' });
        }
      }

      await UsuariosModel.eliminar(id);
      res.json({ success: true, data: { id }, message: 'Usuario eliminado permanentemente' });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async desactivar(req, res) {
    try {
      const { id } = req.params;
      const usuario = await UsuariosModel.obtenerPorIdIncluyendoEliminados(id);

      if (!usuario) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      if (usuario.deleted_at) {
        return res.status(400).json({ success: false, error: 'El usuario ya está desactivado' });
      }

      if (req.user?.rol === 'ADMIN') {
        const empresaIdUsuario = req.user?.clinica_id ?? req.user?.empresa_id;
        if (usuario.clinica_id !== empresaIdUsuario) {
          return res.status(403).json({ success: false, error: 'ADMIN solo puede desactivar usuarios de su empresa' });
        }

        if (usuario.rol === 'ADMIN' || usuario.rol === 'SUPERADMIN') {
          return res.status(403).json({ success: false, error: 'ADMIN no puede desactivar usuarios ADMIN o SUPERADMIN' });
        }
      }

      const usuarioDesactivado = await UsuariosModel.softDelete(id, req.user?.id);
      return res.json({ success: true, data: usuarioDesactivado, message: 'Usuario desactivado correctamente' });
    } catch (error) {
      console.error('Error al desactivar usuario:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async reactivar(req, res) {
    try {
      const { id } = req.params;
      const usuario = await UsuariosModel.obtenerPorIdIncluyendoEliminados(id);

      if (!usuario) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      if (req.user?.rol === 'ADMIN') {
        const empresaIdUsuario = req.user?.clinica_id ?? req.user?.empresa_id;
        if (usuario.clinica_id !== empresaIdUsuario) {
          return res.status(403).json({ success: false, error: 'ADMIN solo puede reactivar usuarios de su empresa' });
        }

        if (usuario.rol === 'ADMIN' || usuario.rol === 'SUPERADMIN') {
          return res.status(403).json({ success: false, error: 'ADMIN no puede reactivar usuarios ADMIN o SUPERADMIN' });
        }
      }

      const usuarioReactivado = await UsuariosModel.reactivar(id);
      return res.json({ success: true, data: usuarioReactivado, message: 'Usuario reactivado correctamente' });
    } catch (error) {
      console.error('Error al reactivar usuario:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async login(req, res) {
    try {
      asegurarCsrfCookie(req, res);
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email y contraseña son requeridos' });
      }

      const usuario = await UsuariosModel.obtenerPorEmailConPassword(normalizarEmail(email));
      if (!usuario) {
        return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      }

      if (usuario.estado !== 'ACTIVO') {
        return res.status(401).json({ success: false, error: 'Usuario inactivo' });
      }

      const coincide = await comparePassword(password, usuario.password_hash);
      if (!coincide) {
        return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      }

      const usuarioConLogin = await UsuariosModel.actualizarUltimoLogin(usuario.id);
      const contextoEmpresa = await UsuariosModel.obtenerContextoEmpresa(usuarioConLogin.id);

      let suscripcion = null;
      if (usuarioConLogin.rol !== 'SUPERADMIN') {
        // Verificar suscripción pero permitir entrada incluso si no existe (ADMIN puede ver panel con restricciones)
        suscripcion = await SuscripcionesModel.obtenerVigentePorEmpresa(usuarioConLogin.clinica_id);
      }

      const redirectPath = construirRedirectPath(usuarioConLogin, contextoEmpresa);

      if (!redirectPath) {
        return res.status(403).json({ success: false, error: 'Usuario sin clinica asignada o sin ruta de acceso valida' });
      }

      const clinica = contextoEmpresa ? {
        id: contextoEmpresa.id,
        nombre: contextoEmpresa.nombre,
        estado: contextoEmpresa.estado,
        tipo_negocio_id: contextoEmpresa.tipo_negocio_id,
        tipo_negocio_codigo: contextoEmpresa.tipo_negocio_codigo,
        tipo_negocio_nombre: contextoEmpresa.tipo_negocio_nombre
      } : null;
      const refreshToken = generarRefreshToken(usuarioConLogin);
      const refreshTokenHash = hashToken(refreshToken);
      const refreshExpira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const nuevaSesion = await RefreshTokensModel.crear({
        usuario_id: usuarioConLogin.id,
        token_hash: refreshTokenHash,
        expires_at: refreshExpira
      });

      const accessToken = generarAccessToken(usuarioConLogin, nuevaSesion.id);

      res.cookie('access_token', accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000
      });

      res.cookie('refresh_token', refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        data: {
          ...usuarioConLogin,
          sessionId: nuevaSesion.id,
          clinica,
          empresa: clinica,
          suscripcion,
          redirect_path: redirectPath
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async refresh(req, res) {
    try {
      asegurarCsrfCookie(req, res);
      const refreshToken = req.cookies?.refresh_token;

      if (!refreshToken) {
        return res.status(401).json({ success: false, error: 'Refresh token requerido' });
      }

      const payload = verificarRefreshToken(refreshToken);
      const usuario = await UsuariosModel.obtenerPorId(payload.sub);

      if (!usuario || usuario.estado !== 'ACTIVO') {
        return res.status(401).json({ success: false, error: 'Usuario no válido' });
      }

      const refreshTokenHash = hashToken(refreshToken);
      const registro = await RefreshTokensModel.obtenerActivoPorHash(refreshTokenHash);

      if (!registro) {
        return res.status(401).json({ success: false, error: 'Refresh token revocado' });
      }

      if (new Date(registro.expires_at).getTime() < Date.now()) {
        await RefreshTokensModel.revocarPorId(registro.id);
        return res.status(401).json({ success: false, error: 'Refresh token expirado' });
      }

      await RefreshTokensModel.revocarPorId(registro.id);

      const usuarioConActividad = await UsuariosModel.actualizarUltimoLogin(usuario.id);

      const nuevoRefreshToken = generarRefreshToken(usuarioConActividad);
      const nuevoHash = hashToken(nuevoRefreshToken);
      const nuevoExpira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const nuevaSesion = await RefreshTokensModel.crear({
        usuario_id: usuarioConActividad.id,
        token_hash: nuevoHash,
        expires_at: nuevoExpira
      });

      const accessToken = generarAccessToken(usuarioConActividad, nuevaSesion.id);

      res.cookie('access_token', accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000
      });

      res.cookie('refresh_token', nuevoRefreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({ success: true, data: usuarioConActividad });
    } catch (error) {
      console.error('Error al refrescar sesión:', error);
      res.status(401).json({ success: false, error: 'Refresh token inválido o expirado' });
    }
  }

  static async logout(req, res) {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      const refreshTokenHash = hashToken(refreshToken);
      await RefreshTokensModel.revocarPorHash(refreshTokenHash);
    }
    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);
    res.json({ success: true, message: 'Sesión cerrada' });
  }

  static async csrf(req, res) {
    asegurarCsrfCookie(req, res);
    res.json({ success: true });
  }
}

module.exports = UsuariosController;
