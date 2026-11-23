import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../Config/app_error';
import type { UserInfo } from '../Types/api';

export const getActor = (request: Request): UserInfo => {
  if (!request.userInfo) throw new AppError(401, 'You are not authorized to access.');
  return request.userInfo;
};

export function routeHandler(
  action: (request: Request, response: Response) => Promise<unknown>,
  created = false,
) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await action(request, response);
      if (!response.headersSent) {
        if (created) response.handler.created(result);
        else response.handler.success(result);
      }
    } catch (error) {
      next(error);
    }
  };
}
