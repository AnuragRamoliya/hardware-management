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
    else if (error.statusCode === 410) {
      res.status(410).json({ message: error.message, data: null });
    } else res.handler.badRequest(error.details ?? null, error.message);
    return;
  }
  const status =
    typeof error === 'object' && error !== null
      ? (error as Record<string, unknown>).status || (error as Record<string, unknown>).statusCode
      : undefined;
  if (typeof status === 'number') {
    const msg = error instanceof Error ? error.message : 'Request failed';
    if (status === 403) {
      res.handler.forbidden(null, msg);
      return;
    }
    if (status === 401) {
      res.handler.unauthorized(null, msg);
      return;
    }
    if (status === 404) {
      res.handler.notFound(null, msg);
      return;
    }
    if (status === 410) {
      res.status(410).json({ message: msg, data: null });
      return;
    }
    if (status === 400) {
      res.handler.badRequest(null, msg);
      return;
    }
  }
  logger.error(
    'Unhandled request error',
    error instanceof Error ? { message: error.message, stack: error.stack } : { error },
  );
  res.status(500).json({ message: STATUS_MESSAGES.SERVER_ERROR, data: null });
};
