import swaggerJsdoc from 'swagger-jsdoc';
import { resourcePaths } from './resources';
import { userPaths } from './users';

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'ITAM API',
    description:
      'IT Asset and Employee Management API. Send `plain-text: true` to bypass compatible payload encryption.',
    version: '1.0.0',
  },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: {
      Token: {
        type: 'apiKey',
        in: 'header',
        name: 'token',
        description: 'Access token from /user/login.',
      },
    },
  },
  paths: { ...userPaths, ...resourcePaths },
};

export const swaggerSpec = swaggerJsdoc({ definition, apis: [] });
