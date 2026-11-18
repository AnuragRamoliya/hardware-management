import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../Config/app_error';
import { UserModel } from '../Models/users';
import type { UserInfo } from '../Types/api';
import { ResourceController } from './resources';
import { users } from '../Database/Schema';
import { MODULES } from '../Config/constant';

function body(request: Request): Record<string, unknown> {
  if (typeof request.body !== 'object' || request.body === null || Array.isArray(request.body))
    return {};
  return request.body as Record<string, unknown>;
}

function actor(request: Request): UserInfo {
  if (!request.userInfo) throw new AppError(401, 'You are not authorized to access.');
  return request.userInfo;
}

export class UserController extends ResourceController {
  private readonly userModel = new UserModel();

  constructor() {
    super(users, {
      table: 'user',
      module: MODULES.USER,
      writableFields: ['role_id', 'first_name', 'last_name', 'email', 'image', 'status'],
      searchFields: ['first_name', 'last_name', 'email'],
      optionFields: ['id', 'first_name', 'last_name', 'email'],
      filterableFields: {
        role_id: 'number', first_name: 'text', last_name: 'text',
        email: 'text', status: 'number',
      },
    });
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = body(req);
      res.handler.success(
        await this.userModel.login(String(input.email), String(input.password)),
        'Login successfully.',
      );
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = body(req).refresh_token;
      if (typeof refreshToken !== 'string' || !refreshToken) {
        throw new AppError(400, 'refresh_token is required.');
      }
      res.handler.success(
        await this.userModel.refresh(refreshToken),
        'Tokens rotated successfully.',
      );
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.get('token');
      if (!token) throw new AppError(401, 'Token is required.');
      await this.userModel.logout(token);
      res.handler.success(null, 'Logout successfully.');
    } catch (error) {
      next(error);
    }
  }

  async profile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.handler.success(await this.userModel.getProfile(actor(req)));
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.handler.success(await this.userModel.updateProfile(body(req), actor(req)));
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.userModel.changePassword(body(req), actor(req));
      res.handler.success(null, 'Password has been changed successfully.');
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const email = body(req).email;
      if (typeof email !== 'string') throw new AppError(400, 'A valid email is required.');
      const result = await this.userModel.forgotPassword(email);
      res.handler.success(
        result,
        'If the account exists, password reset instructions have been sent.',
      );
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = body(req);
      res.handler.success(
        await this.userModel.verifyOtp(String(input.otp), String(input.otp_reference)),
        'OTP matched.',
      );
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.userModel.resetPassword(body(req));
      res.handler.success(null, 'Password has been changed successfully.');
    } catch (error) {
      next(error);
    }
  }

  async addUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.handler.created(await this.userModel.addUser(body(req), actor(req)));
    } catch (error) {
      next(error);
    }
  }

  override async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.userModel.delete(Number(req.params.id), actor(req));
      res.handler.success(null, 'User deleted successfully.');
    } catch (error) {
      next(error);
    }
  }
}
