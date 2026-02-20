const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Estudio API - Healthcare Management SaaS',
      version: '1.0.0',
      description: 'Backend API para gestión de clínicas, usuarios y pacientes',
      contact: {
        name: 'API Support',
        email: 'support@estudio.local'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.estudio.prod',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from /api/usuarios/login'
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'x-csrf-token',
          description: 'CSRF token from cookie'
        }
      }
    },
    security: [
      {
        bearerAuth: [],
        csrfToken: []
      }
    ],
    tags: [
      {
        name: 'Autenticación',
        description: 'Login, refresh tokens, logout'
      },
      {
        name: 'Usuarios',
        description: 'Gestión de usuarios del sistema'
      },
      {
        name: 'Clínicas',
        description: 'Gestión de clínicas'
      },
      {
        name: 'Persona',
        description: 'Datos de personas (pacientes, doctores, staff)'
      },
      {
        name: 'Auditoría',
        description: 'Logs de cambios y auditoría'
      },
      {
        name: 'Health',
        description: 'System health checks'
      }
    ]
  },
  apis: [
    'src/routes/*.js',
    'src/controllers/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
