import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { Op } from 'sequelize';
import { env } from '../Config/env';
import { AppError } from '../Config/app_error';
import { ACCESS_TYPES, STATUS, STATUS_MESSAGES } from '../Config/constant';
import {
  modules,
  permissions,
  roles,
  user_tokens,
  users,
  type RowAttributes,
} from '../Database/Schema';
import { hashToken } from '../Utils/encryption';

function plain(row: import('sequelize').Model): RowAttributes {
  return row.get({ plain: true }) as RowAttributes;
}

export const userAuth: RequestHandler = async (req, _res, next): Promise<void> => {
  try {
    const token = req.get('token');
    if (!token) throw new AppError(401, STATUS_MESSAGES.TOKEN_REQUIRED);
    const payload = jwt.verify(token, env.SECRET_KEY);
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      throw new AppError(401, STATUS_MESSAGES.TOKEN_INVALID);
    }
    const session = await user_tokens.findOne({
      where: { token: hashToken(token), expires_at: { [Op.gt]: new Date() } },
    });
    if (!session) throw new AppError(401, STATUS_MESSAGES.TOKEN_INVALID);
    const user = await users.findOne({
      where: { id: payload.sub, status: STATUS.ACTIVE },
      include: [{ model: roles, as: 'role', attributes: ['id', 'name'] }],
    });
    if (!user) throw new AppError(401, STATUS_MESSAGES.TOKEN_INVALID);
    const userData = plain(user);
    req.userInfo = {
      id: Number(userData.id),
      role_id: Number(userData.role_id),
      first_name: String(userData.first_name),
      last_name: String(userData.last_name),
      email: String(userData.email),
    };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError(401, STATUS_MESSAGES.TOKEN_INVALID));
  }
};

export function checkAccess(
  moduleName: string,
  access: (typeof ACCESS_TYPES)[keyof typeof ACCESS_TYPES],
): RequestHandler {
  return async (req, _res, next): Promise<void> => {
    try {
      if (!req.userInfo) throw new AppError(401, STATUS_MESSAGES.UNAUTHORIZED);
      const targetModules =
        moduleName === 'reports' || moduleName === 'report' ? ['report', 'reports'] : [moduleName];
      const module = await modules.findOne({
        where: { name: { [Op.in]: targetModules }, status: STATUS.ACTIVE },
      });
      if (!module) throw new AppError(403, STATUS_MESSAGES.FORBIDDEN);
      const moduleId = Number(plain(module).id);
      const permission = await permissions.findOne({
        where: {
          role_id: req.userInfo.role_id,
          module_id: moduleId,
          [access]: 1,
          status: { [Op.ne]: STATUS.DELETED },
        },
      });
      if (!permission) throw new AppError(403, STATUS_MESSAGES.FORBIDDEN);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function checkOptionsAccess(moduleName: string): RequestHandler {
  return async (req, _res, next): Promise<void> => {
    try {
      if (!req.userInfo) throw new AppError(401, STATUS_MESSAGES.UNAUTHORIZED);
      const targetModules =
        moduleName === 'reports' || moduleName === 'report' ? ['report', 'reports'] : [moduleName];
      const module = await modules.findOne({
        where: { name: { [Op.in]: targetModules }, status: STATUS.ACTIVE },
      });
      if (!module) throw new AppError(403, STATUS_MESSAGES.FORBIDDEN);
      const moduleId = Number(plain(module).id);
      const permission = await permissions.findOne({
        where: {
          role_id: req.userInfo.role_id,
          module_id: moduleId,
          status: STATUS.ACTIVE,
          [Op.or]: [{ read_access: 1 }, { options_access: 1 }],
        },
      });
      if (!permission) throw new AppError(403, STATUS_MESSAGES.FORBIDDEN);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function getVerifiedRefreshUser(refreshToken: string): JwtPayload | null {
  try {
    const payload = jwt.verify(refreshToken, env.SECRET_KEY);
    return typeof payload === 'string' ? null : payload;
  } catch {
    return null;
  }
}

export { hashToken };
