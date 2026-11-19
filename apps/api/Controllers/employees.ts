import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../Config/app_error';
import { EmployeeService } from '../Services/employees';
import { EmployeeImportService } from '../Services/employee_import';
import { getActor, getRequestBody } from './base_crud.controller';
import type { ListDto } from '../Types/api';

export class EmployeeController {
  private readonly service = new EmployeeService();
  private readonly importer = new EmployeeImportService(this.service);

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
      res.handler.success(null, 'Employee deleted successfully.');
    } catch (error) {
      next(error);
    }
  }

  async bulkImport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError(400, 'An XLSX or CSV file is required.');
      res.handler.success(await this.importer.import(req.file, getActor(req)));
    } catch (error) {
      next(error);
    }
  }
}
