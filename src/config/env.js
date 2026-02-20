const dotenv = require('dotenv');

dotenv.config();

const requiredInAllEnvs = ['DATABASE_URL'];
const requiredInProduction = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

function validarEnv() {
  const faltantes = requiredInAllEnvs.filter((key) => !process.env[key]);
  if (faltantes.length) {
    throw new Error(`Faltan variables de entorno obligatorias: ${faltantes.join(', ')}`);
  }

  if (process.env.NODE_ENV === 'production') {
    const faltantesProd = requiredInProduction.filter((key) => !process.env[key]);
    if (faltantesProd.length) {
      throw new Error(`Faltan variables de entorno obligatorias en producción: ${faltantesProd.join(', ')}`);
    }

    if (process.env.JWT_ACCESS_SECRET === 'change_me_access_secret' || process.env.JWT_REFRESH_SECRET === 'change_me_refresh_secret') {
      throw new Error('No se permiten secretos JWT por defecto en producción');
    }

    if (!process.env.CORS_ORIGINS) {
      throw new Error('CORS_ORIGINS es obligatorio en producción');
    }

    if (process.env.CORS_STRICT !== 'true') {
      throw new Error('CORS_STRICT debe ser true en producción');
    }

    if (process.env.DB_SSL !== 'true') {
      throw new Error('DB_SSL debe ser true en producción');
    }
  }
}

validarEnv();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000)
};
