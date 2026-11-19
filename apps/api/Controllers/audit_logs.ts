import type { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { AppError } from '../Config/app_error';
import { STATUS } from '../Config/constant';
import { activity_logs, type RowAttributes } from '../Database/Schema';
import { applyMultiFieldSearch, getPagination, getSorting } from '../Utils/helpers';
import { getRequestBody } from './base_crud.controller';
import type { ListDto } from '../Types/api';

export class AuditController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = getRequestBody(req);
      const filters = (input.filters ?? {}) as Record<string, unknown>;
      const where: Record<string | symbol, unknown> = { status: { [Op.ne]: STATUS.DELETED } };
      for (const [key, column, kind] of [
        ['module', 'module', 'text'],
        ['module_id', 'module_id', 'number'],
        ['action', 'action', 'text'],
        ['created_by', 'created_by', 'number'],
        ['user_id', 'created_by', 'number'],
      ] as const) {
        const value = filters[key];
        if (value === undefined || value === '' || value === null) continue;
        const values = Array.isArray(value) ? value : [value];
        const normalized = values.map((item) => {
          if (kind === 'text' && typeof item === 'string') return item;
          if (
            kind === 'number' &&
            (typeof item === 'number' || (typeof item === 'string' && /^\d+$/.test(item)))
          ) {
            const number = Number(item);
            if (Number.isSafeInteger(number) && number > 0) return number;
          }
          throw new AppError(422, `Invalid value for audit filter ${key}.`);
        });
        if (normalized.length) {
          where[column] = Array.isArray(value) ? { [Op.in]: normalized } : normalized[0];
        }
      }
      applyMultiFieldSearch(
        where,
        typeof input.general_search === 'string'
          ? input.general_search
          : typeof filters.general_search === 'string'
            ? filters.general_search
            : undefined,
        ['module', 'action', 'description', 'created_by_name'],
      );
      const dateRange =
        typeof filters.createdAt === 'object' && filters.createdAt !== null
          ? (filters.createdAt as Record<string, unknown>)
          : { from: filters.from, to: filters.to };
      if (Object.keys(dateRange).some((key) => key !== 'from' && key !== 'to')) {
        throw new AppError(422, 'Audit date filter must contain only from and to.');
      }
      if (dateRange.from || dateRange.to) {
        const from = dateRange.from ? new Date(String(dateRange.from)) : undefined;
        const to = dateRange.to ? new Date(String(dateRange.to)) : undefined;
        if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
          throw new AppError(422, 'Audit date filters must be valid dates.');
        }
        if (to && typeof dateRange.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateRange.to)) {
          to.setHours(23, 59, 59, 999);
        }
        where.createdAt = {
          ...(from ? { [Op.gte]: from } : {}),
          ...(to ? { [Op.lte]: to } : {}),
        };
      }
      const pagination = getPagination(input as ListDto);
      const allowedAuditColumns = new Set([
        'id',
        'module',
        'module_id',
        'action',
        'created_by',
        'created_by_name',
        'createdAt',
      ]);
      const order = getSorting(input as ListDto, allowedAuditColumns, [['createdAt', 'DESC']]);
      const result = await activity_logs.findAndCountAll({
        where,
        limit: pagination.limit,
        offset: pagination.offset,
        order,
      });
      res.handler.success({
        rows: result.rows.map((item) => item.get({ plain: true }) as RowAttributes),
        count: result.count,
      });
    } catch (error) {
      next(error);
    }
  }

  async export(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const where: Record<string | symbol, unknown> = { status: { [Op.ne]: STATUS.DELETED } };
      for (const key of ['module', 'module_id', 'action', 'created_by']) {
        if (req.query[key]) where[key] = String(req.query[key]);
      }
      if (req.query.user_id) where.created_by = String(req.query.user_id);
      if (typeof req.query.general_search === 'string') {
        applyMultiFieldSearch(where, req.query.general_search, [
          'module',
          'action',
          'description',
          'created_by_name',
        ]);
      }
      if (req.query.from || req.query.to) {
        const from = req.query.from ? new Date(String(req.query.from)) : undefined;
        const to = req.query.to ? new Date(String(req.query.to)) : undefined;
        if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
          throw new AppError(422, 'Audit date filters must be valid dates.');
        }
        where.createdAt = {
          ...(from ? { [Op.gte]: from } : {}),
          ...(to ? { [Op.lte]: to } : {}),
        };
      }
      const rows = await activity_logs.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: 10_000,
      });
      const quote = (value: unknown): string => {
        const text = String(value ?? '');
        const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
        return `"${safeText.replaceAll('"', '""')}"`;
      };
      const columns = [
        'id',
        'module',
        'module_id',
        'action',
        'field',
        'description',
        'created_by',
        'createdAt',
      ];
      const csv = [
        columns.join(','),
        ...rows.map((entry) => {
          const record = entry.get({ plain: true }) as RowAttributes;
          return columns.map((field) => quote(record[field])).join(',');
        }),
      ].join('\r\n');
      res.type('text/csv').attachment('audit.csv').send(csv);
    } catch (error) {
      next(error);
    }
  }

  async modules(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const distinct = await activity_logs.findAll({
        attributes: ['module'],
        group: ['module'],
        order: [['module', 'ASC']],
      });
      res.handler.success(distinct.map((item) => item.get('module')));
    } catch (error) {
      next(error);
    }
  }
}
