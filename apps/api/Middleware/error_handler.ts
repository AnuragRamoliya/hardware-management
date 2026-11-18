import type { ErrorRequestHandler } from 'express';
import { AppError } from '../Config/app_error';
import { logger } from '../Config/logger';
import { STATUS_CODES, STATUS_MESSAGES } from '../Config/constant';
import { UniqueConstraintError, ValidationError } from 'sequelize';

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next): void => {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof UniqueConstraintError) {
    res.handler.conflict(null, 'A record with the supplied unique value already exists.');
    return;
  }
  if (error instanceof ValidationError) {
    res.handler.validationError(null, 'The submitted data is invalid.');
    return;
  }
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error('Unhandled application error', { message: error.message, stack: error.stack });
      res.handler.serverError(error);
      return;
    }
    if (error.statusCode === STATUS_CODES.UNAUTHORIZED)
      res.handler.unauthorized(error.details ?? null, error.message);
    else if (error.statusCode === STATUS_CODES.FORBIDDEN)
      res.handler.forbidden(error.details ?? null, error.message);
    else if (error.statusCode === STATUS_CODES.NOT_FOUND)
      res.handler.notFound(error.details ?? null, error.message);
    else if (error.statusCode === STATUS_CODES.CONFLICT)
      res.handler.conflict(error.details ?? null, error.message);
    else if (error.statusCode === STATUS_CODES.VALIDATION_ERROR)
      res.handler.validationError(error.details ?? null, error.message);
    else res.handler.badRequest(error.details ?? null, error.message);
    return;
  }
  logger.error(
    'Unhandled request error',
    error instanceof Error ? { message: error.message, stack: error.stack } : { error },
  );
  res.status(500).json({ message: STATUS_MESSAGES.SERVER_ERROR, data: null });
};
