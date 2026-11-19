import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../Config/app_error';
import { BaseCrudService, type CrudResourceDefinition } from '../Services/base_crud.service';
import type { EntityModel } from '../Database/Schema';
import type { ListDto, UserInfo } from '../Types/api';

export function getActor(request: Request): UserInfo {
  if (!request.userInfo) throw new AppError(401, 'You are not authorized to access.');
  return request.userInfo;
}

export function getRequestBody(request: Request): Record<string, unknown> {
  if (typeof request.body !== 'object' || request.body === null || Array.isArray(request.body)) {
    return {};
  }
  return request.body as Record<string, unknown>;
}

export class BaseCrudController {
  protected readonly service: BaseCrudService;
  protected readonly resourceName: string;

  constructor(service: BaseCrudService, resourceName: string);
  constructor(model: EntityModel, definition: CrudResourceDefinition);
  constructor(
    serviceOrModel: BaseCrudService | EntityModel,
    resourceNameOrDef: string | CrudResourceDefinition,
  ) {
    if (typeof resourceNameOrDef === 'string') {
      this.service = serviceOrModel as BaseCrudService;
      this.resourceName = resourceNameOrDef;
    } else {
      this.service = new BaseCrudService(
        serviceOrModel as EntityModel,
        resourceNameOrDef as CrudResourceDefinition,
      );
      this.resourceName = resourceNameOrDef.table;
    }
  }

  async add(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.handler.created(await this.service.add(getRequestBody(req), getActor(req)));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.handler.success(await this.service.update(getRequestBody(req), getActor(req)));
    } catch (error) {
      next(error);
    }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.handler.success(await this.service.get(Number(req.params.id)));
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.handler.success(await this.service.list(getRequestBody(req) as ListDto));
    } catch (error) {
      next(error);
    }
  }

  async options(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.handler.success(await this.service.options(getRequestBody(req)));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.service.delete(Number(req.params.id), getActor(req));
      res.handler.success(null, `${this.resourceName} deleted successfully.`);
    } catch (error) {
      next(error);
    }
  }
}
