const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EquityEdge API',
      version: '1.0.0',
      description:
        'RESTful API for EquityEdge — a paper-trading stock market platform. ' +
        'Supports authentication, stock lookup, order placement, portfolio management, ' +
        'watchlist management, and simulated real-time market prices via Socket.IO.',
      contact: {
        name: 'EquityEdge',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token obtained from /api/auth/login',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // Scan these files for JSDoc @swagger comments
  apis: ['./routes/*.js', './models/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };
