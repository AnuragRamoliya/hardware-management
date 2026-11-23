import winston from 'winston';
import expressWinston from 'express-winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});

export const requestLogger = expressWinston.logger({
  winstonInstance: logger,
  meta: false,
  msg: '{{req.method}} {{req.path}} {{res.statusCode}} - {{res.responseTime}} ms',
  expressFormat: false,
});
