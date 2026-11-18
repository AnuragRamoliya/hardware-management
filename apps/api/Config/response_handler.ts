import type { Request, Response } from 'express';
import { logger } from './logger';
import { STATUS_CODES, STATUS_MESSAGES } from './constant';
import { encryptPayload } from '../Utils/encryption';
import type { ApiResult } from '../Types/api';

export class ResponseHandler {
  constructor(
    private readonly req: Request,
    private readonly res: Response,
  ) {}

  private async sender<T>(code: number, message: string, data: T): Promise<void> {
    const body = { message, data };
    if (this.req.get('plain-text') === 'true') {
      this.res.status(code).json(body);
      return;
    }
    try {
      const encrypted = await encryptPayload(body);
      this.res.status(code).json(encrypted);
    } catch (error) {
      logger.error('Failed to encrypt response payload', error);
      if (!this.res.headersSent) {
        this.res.status(STATUS_CODES.SERVER_ERROR).json({
          message: STATUS_MESSAGES.SERVER_ERROR,
          data: null,
        });
      }
    }
  }

  success<T>(data: T, message: string = STATUS_MESSAGES.SUCCESS): void {
    void this.sender(STATUS_CODES.SUCCESS, message, data);
  }

  created<T>(data: T, message: string = STATUS_MESSAGES.CREATED): void {
    void this.sender(STATUS_CODES.CREATED, message, data);
  }

  badRequest<T>(data: T, message: string = STATUS_MESSAGES.BAD_REQUEST): void {
    void this.sender(STATUS_CODES.BAD_REQUEST, message, data);
  }

  unauthorized<T>(data?: T, message: string = STATUS_MESSAGES.UNAUTHORIZED): void {
    void this.sender(STATUS_CODES.UNAUTHORIZED, message, data ?? null);
  }

  forbidden<T>(data?: T, message: string = STATUS_MESSAGES.FORBIDDEN): void {
    void this.sender(STATUS_CODES.FORBIDDEN, message, data ?? null);
  }

  notFound<T>(data?: T, message: string = STATUS_MESSAGES.NOT_FOUND): void {
    void this.sender(STATUS_CODES.NOT_FOUND, message, data ?? null);
  }

  conflict<T>(data?: T, message: string = STATUS_MESSAGES.CONFLICT): void {
    void this.sender(STATUS_CODES.CONFLICT, message, data ?? null);
  }

  validationError<T>(data?: T, message: string = STATUS_MESSAGES.VALIDATION_ERROR): void {
    void this.sender(STATUS_CODES.VALIDATION_ERROR, message, data ?? null);
  }

  tooManyRequests(): void {
    void this.sender(
      STATUS_CODES.TOO_MANY_REQUESTS,
      'Too many requests. Please try again later.',
      null,
    );
  }

  serverError(error: unknown): void {
    logger.error(
      'Request failed',
      error instanceof Error ? { message: error.message, stack: error.stack } : { error },
    );
    void this.sender(STATUS_CODES.SERVER_ERROR, STATUS_MESSAGES.SERVER_ERROR, null);
  }

  commonHandler<T>(result: ApiResult<T> | T): boolean {
    if (typeof result !== 'object' || result === null || !('status' in result)) return true;
    const apiResult = result as ApiResult<T>;
    switch (apiResult.status) {
      case STATUS_CODES.CREATED:
        this.created(apiResult.data ?? null, apiResult.message);
        return false;
      case STATUS_CODES.BAD_REQUEST:
        this.badRequest(apiResult.data ?? null, apiResult.message);
        return false;
      case STATUS_CODES.UNAUTHORIZED:
        this.unauthorized(apiResult.data ?? null, apiResult.message);
        return false;
      case STATUS_CODES.FORBIDDEN:
        this.forbidden(apiResult.data ?? null, apiResult.message);
        return false;
      case STATUS_CODES.NOT_FOUND:
        this.notFound(apiResult.data ?? null, apiResult.message);
        return false;
      case STATUS_CODES.CONFLICT:
        this.conflict(apiResult.data ?? null, apiResult.message);
        return false;
      case STATUS_CODES.VALIDATION_ERROR:
        this.validationError(apiResult.data ?? null, apiResult.message);
        return false;
      case STATUS_CODES.SERVER_ERROR:
        this.serverError(apiResult.data);
        return false;
      default:
        return true;
    }
  }
}

export const responseHandler = (req: Request, res: Response, next: () => void): void => {
  res.handler = new ResponseHandler(req, res);
  next();
};
