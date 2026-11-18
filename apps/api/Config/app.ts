import { env } from './env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { AppError } from './app_error';
import { requestLogger } from './logger';
import { responseHandler } from './response_handler';
import { errorHandler } from '../Middleware/error_handler';
import { router as userRoutes } from '../Routes/users';
import { router as apiRoutes } from '../Routes';
import { swaggerSpec } from '../Swagger';

export function createApp(): express.Express {
  const app = express();
  const allowedOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim());
  app.disable('x-powered-by');
  app.use(responseHandler);
  app.use(helmet());
  app.use(
    cors((request, callback) => {
      const origin = request.header('Origin');
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, { origin: origin ?? false, credentials: true });
        return;
      }
      callback(new AppError(403, 'Origin is not allowed by CORS.'));
    }),
  );
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 600,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, res) => res.handler.tooManyRequests(),
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(express.text({ type: 'text/plain', limit: '10mb' }));
  app.use(requestLogger);

  app.get('/', (_req, res) => res.status(200).send('ITAM API'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/user', userRoutes);
  app.use(apiRoutes);
  app.use((_req, _res, next) => next(new AppError(404, 'Route not found.')));
  app.use(errorHandler);
  return app;
}
