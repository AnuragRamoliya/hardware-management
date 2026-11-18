import type { Request, RequestHandler, Router } from 'express';
import { Op } from 'sequelize';
import { AppError } from '../Config/app_error';
import { STATUS } from '../Config/constant';
import { activity_logs } from '../Database/Schema';
import { getPagination } from './helpers';
import type { ListDto } from '../Types/api';

interface ActivityRouteOptions {
  router: Router;
  payloadDecrypt: RequestHandler;
  userAuth: RequestHandler;
  checkAccess: RequestHandler | RequestHandler[];
  module: string;
  singleton?: boolean;
}

function body(request: Request): Record<string, unknown> {
  if (typeof request.body !== 'object' || request.body === null || Array.isArray(request.body))
    return {};
  return request.body as Record<string, unknown>;
}

export function registerActivityRoute(options: ActivityRouteOptions): void {
  const { router, payloadDecrypt, userAuth, checkAccess, module, singleton = false } = options;
  router.post(
    '/activity',
    payloadDecrypt,
    userAuth,
    ...(Array.isArray(checkAccess) ? checkAccess : [checkAccess]),
    async (req, res, next): Promise<void> => {
      try {
        const input = body(req);
        const id = input.id;
        if (!singleton && (!id || !Number.isInteger(Number(id)))) {
          throw new AppError(422, 'id is required for resource activity.');
        }
        const where = {
          module,
          status: { [Op.ne]: STATUS.DELETED },
          ...(singleton ? {} : { module_id: Number(id) }),
        };
        const pagination = getPagination(input as ListDto);
        const result = await activity_logs.findAndCountAll({
          where,
          limit: pagination.limit,
          offset: pagination.offset,
          order: [['createdAt', 'DESC']],
        });
        res.handler.success({
          rows: result.rows.map((item) => item.get({ plain: true })),
          count: result.count,
        });
      } catch (error) {
        next(error);
      }
    },
  );
}
