const axios = require('axios');

const API_DNI_URL = 'https://api.perudevs.com/api/v1/dni/complete';
const API_KEY = process.env.PERU_DEVS_API_KEY || 'cGVydWRldnMucHJvZHVjdGlvbi5maXRjb2RlcnMuNjk5MjVkMzQwNGEyNjc2MDk2ZjkzZDA1';

async function obtenerPersonaPorDni(dni) {
  try {
    const response = await axios.get(API_DNI_URL, {
      params: {
        document: dni,
        key: API_KEY
      },
      timeout: 5000
    });

    if (!response.data || response.data.estado !== true || !response.data.resultado) {
      return null;
    }

    const datosPersona = response.data.resultado;

    return {
      dni: datosPersona.dni || dni,
      nombres: datosPersona.nombres,
      apellido_paterno: datosPersona.apellido_paterno,
      apellido_materno: datosPersona.apellido_materno,
      sexo: mapearSexo(datosPersona.genero),
      fecha_nacimiento: formatearFecha(datosPersona.fecha_nacimiento)
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }

    console.error('❌ Error al consultar API perudevs:', error.message);
    return null;
  }
}

function mapearSexo(sexoAPI) {
  const mapeo = {
    M: 'MASCULINO',
    F: 'FEMENINO'
  };

  return mapeo[sexoAPI?.toUpperCase()];
}

function formatearFecha(fecha) {
  if (!fecha) return null;

  try {
    if (fecha.includes('-')) {
      return fecha;
    }

    if (fecha.includes('/')) {
      const [dia, mes, anio] = fecha.split('/');
      return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    return null;
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return null;
  }
}

module.exports = {
  obtenerPersonaPorDni
};
