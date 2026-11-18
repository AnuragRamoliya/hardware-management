import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncController = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler =
  (handler: AsyncController): RequestHandler =>
  (req, res, next): void => {
    void handler(req, res, next).catch(next);
  };
