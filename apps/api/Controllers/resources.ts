import type { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { AppError } from '../Config/app_error';
import { ACTIVITY_ACTIONS, MODULES, STATUS } from '../Config/constant';
import { sequelize } from '../Config/database';
import {
  activity_logs,
  asset_categories,
  departments,
  designations,
  locations,
  modules,
  permissions,
  roles,
  vendors,
  type EntityModel,
  type RowAttributes,
} from '../Database/Schema';
import { EmployeeService } from '../Services/employees';
import { EmployeeImportService } from '../Services/employee_import';
import {
  applyMultiFieldSearch,
  createActivityLog,
  getPagination,
  getSorting,
} from '../Utils/helpers';
import { ResourceModel, type ResourceDefinition } from '../Models/resource';
import type { ListDto, UserInfo } from '../Types/api';

function actor(request: Request): UserInfo {
  if (!request.userInfo) throw new AppError(401, 'You are not authorized to access.');
  return request.userInfo;
}

function body(request: Request): Record<string, unknown> {
  if (typeof request.body !== 'object' || request.body === null || Array.isArray(request.body))
    return {};
  return request.body as Record<string, unknown>;
}

export class ResourceController {
  private readonly model: ResourceModel;

  constructor(model: EntityModel, definition: ResourceDefinition) {
    this.model = new ResourceModel(model, definition);
  }

  async add(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.handler.created(await this.model.add(body(req), actor(req)));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.handler.success(await this.model.update(body(req), actor(req)));
    } catch (error) {
      next(error);
    }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.handler.success(await this.model.get(Number(req.params.id)));
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.handler.success(await this.model.list(body(req) as ListDto));
    } catch (error) {
      next(error);
    }
  }

  async options(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.handler.success(await this.model.options(body(req)));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.model.delete(Number(req.params.id), actor(req));
      res.handler.success(null, `${req.baseUrl.slice(1)} deleted successfully.`);
    } catch (error) {
      next(error);
    }
  }
}

const definitions: Record<
  | 'role'
  | 'module'
  | 'permission'
  | 'department'
  | 'designation'
  | 'location'
  | 'vendor'
  | 'asset_category',
  { model: EntityModel; definition: ResourceDefinition }
> = {
  role: {
    model: roles,
    definition: {
      table: 'role',
      module: MODULES.ROLE,
      writableFields: ['name', 'type', 'status'],
      searchFields: ['name', 'type'],
      optionFields: ['id', 'name', 'type'],
      filterableFields: { name: 'text', type: 'text', status: 'number' },
    },
  },
  module: {
    model: modules,
    definition: {
      table: 'module',
      module: MODULES.MODULE,
      writableFields: ['name', 'sortOrder', 'status'],
      searchFields: ['name'],
      optionFields: ['id', 'name'],
      filterableFields: { name: 'text', status: 'number' },
    },
  },
  permission: {
    model: permissions,
    definition: {
      table: 'permission',
      module: MODULES.PERMISSION,
      writableFields: [
        'role_id',
        'module_id',
        'read_access',
        'write_access',
        'delete_access',
        'status',
      ],
      searchFields: [],
      filterableFields: {
        role_id: 'number',
        module_id: 'number',
        read_access: 'boolean',
        write_access: 'boolean',
        delete_access: 'boolean',
        status: 'number',
      },
    },
  },
  department: {
    model: departments,
    definition: {
      table: 'department',
      module: MODULES.DEPARTMENT,
      writableFields: ['name', 'description', 'status'],
      searchFields: ['name'],
      optionFields: ['id', 'name'],
      filterableFields: { name: 'text', status: 'number' },
      includeAttributes: [
        [
          sequelize.literal(
            '(SELECT COUNT(*) FROM `employees` WHERE `employees`.`department_id` = `departments`.`id` AND `employees`.`status` != 0)',
          ),
          'employees_count',
        ],
      ],
    },
  },
  designation: {
    model: designations,
    definition: {
      table: 'designation',
      module: MODULES.DESIGNATION,
      writableFields: ['name', 'description', 'status'],
      searchFields: ['name'],
      optionFields: ['id', 'name'],
      filterableFields: { name: 'text', status: 'number' },
    },
  },
  location: {
    model: locations,
    definition: {
      table: 'location',
      module: MODULES.LOCATION,
      writableFields: ['name', 'address', 'status'],
      searchFields: ['name', 'address'],
      optionFields: ['id', 'name'],
      filterableFields: { name: 'text', address: 'text', status: 'number' },
    },
  },
  vendor: {
    model: vendors,
    definition: {
      table: 'vendor',
      module: MODULES.VENDOR,
      writableFields: ['name', 'contact_name', 'email', 'phone', 'address', 'status'],
      searchFields: ['name', 'contact_name', 'email', 'phone'],
      optionFields: ['id', 'name'],
      filterableFields: {
        name: 'text',
        contact_name: 'text',
        email: 'text',
        status: 'number',
      },
    },
  },
  asset_category: {
    model: asset_categories,
    definition: {
      table: 'asset_category',
      module: MODULES.ASSET_CATEGORY,
      writableFields: ['name', 'description', 'status'],
      searchFields: ['name'],
      optionFields: ['id', 'name'],
      filterableFields: { name: 'text', status: 'number' },
      includeAttributes: [
        [
          sequelize.literal(
            '(SELECT COUNT(*) FROM `assets` WHERE `assets`.`category_id` = `asset_categories`.`id` AND `assets`.`status` != 0)',
          ),
          'assets_count',
        ],
      ],
    },
  },
};

export class EmployeeController {
  private readonly service = new EmployeeService();
  private readonly importer = new EmployeeImportService(this.service);

  async add(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.handler.created(await this.service.add(body(req), actor(req)));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.handler.success(await this.service.update(body(req), actor(req)));
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
      res.handler.success(await this.service.list(body(req) as ListDto));
    } catch (error) {
      next(error);
    }
  }

  async options(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.handler.success(await this.service.options(body(req)));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.service.delete(Number(req.params.id), actor(req));
      res.handler.success(null, 'Employee deleted successfully.');
    } catch (error) {
      next(error);
    }
  }

  async bulkImport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError(400, 'An XLSX or CSV file is required.');
      res.handler.success(await this.importer.import(req.file, actor(req)));
    } catch (error) {
      next(error);
    }
  }
}

export class RoleController extends ResourceController {
  constructor() {
    super(roles, definitions.role.definition);
  }

  async getPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = Number(req.params.id);
      const rows = await permissions.findAll({
        where: { role_id: roleId, status: { [Op.ne]: STATUS.DELETED } },
        include: [{ model: modules, attributes: ['id', 'name'] }],
        order: [['module_id', 'ASC']],
      });
      res.handler.success(rows.map((item) => item.get({ plain: true }) as RowAttributes));
    } catch (error) {
      next(error);
    }
  }

  async getCurrentPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = actor(req).role_id;
      const rows = await permissions.findAll({
        where: { role_id: roleId, status: { [Op.ne]: STATUS.DELETED } },
        include: [{ model: modules, attributes: ['id', 'name'] }],
        order: [['module_id', 'ASC']],
      });
      res.handler.success(rows.map((item) => item.get({ plain: true }) as RowAttributes));
    } catch (error) {
      next(error);
    }
  }

  async setPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleId = Number(req.params.id);
      const input = body(req);
      if (!Array.isArray(input.permissions))
        throw new AppError(422, 'permissions must be an array.');
      const permissionsInput = input.permissions as Array<Record<string, unknown>>;
      await sequelize.transaction(async (transaction) => {
        const role = await roles.findByPk(roleId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!role) throw new AppError(404, 'Role not found.');
        for (const item of permissionsInput) {
          const moduleId = Number(item.module_id);
          const module = await modules.findByPk(moduleId, { transaction });
          if (!module) throw new AppError(422, `Unknown module ID ${moduleId}.`);
          const values = {
            read_access: item.read_access === true || item.read_access === 1 ? 1 : 0,
            write_access: item.write_access === true || item.write_access === 1 ? 1 : 0,
            delete_access: item.delete_access === true || item.delete_access === 1 ? 1 : 0,
            ...(item.options_access === undefined
              ? {}
              : {
                  options_access: item.options_access === true || item.options_access === 1 ? 1 : 0,
                }),
            status: STATUS.ACTIVE,
            updated_by: actor(req).id,
          };
          const existing = await permissions.findOne({
            where: { role_id: roleId, module_id: moduleId },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
          if (existing) await existing.update(values, { transaction });
          else
            await permissions.create(
              { ...values, role_id: roleId, module_id: moduleId },
              { transaction },
            );
        }
        await createActivityLog({
          module: MODULES.ROLE,
          moduleId: roleId,
          action: ACTIVITY_ACTIONS.PERMISSIONS_UPDATED,
          newValue: permissionsInput,
          description: `Permissions for role ${roleId} were updated`,
          createdBy: actor(req).id,
          createdByName: `${actor(req).first_name} ${actor(req).last_name}`,
          transaction,
        });
      });
      res.handler.success(null, 'Role permissions updated successfully.');
    } catch (error) {
      next(error);
    }
  }
}

export class ModuleController extends ResourceController {
  constructor() {
    super(modules, definitions.module.definition);
  }
}

export class PermissionController extends ResourceController {
  constructor() {
    super(permissions, definitions.permission.definition);
  }
}

export class DepartmentController extends ResourceController {
  constructor() {
    super(departments, definitions.department.definition);
  }
}

export class DesignationController extends ResourceController {
  constructor() {
    super(designations, definitions.designation.definition);
  }
}

export class LocationController extends ResourceController {
  constructor() {
    super(locations, definitions.location.definition);
  }
}

export class VendorController extends ResourceController {
  constructor() {
    super(vendors, definitions.vendor.definition);
  }
}

export class AssetCategoryController extends ResourceController {
  constructor() {
    super(asset_categories, definitions.asset_category.definition);
  }
}

export const resourceControllers = {
  role: new RoleController(),
  module: new ModuleController(),
  permission: new PermissionController(),
  department: new DepartmentController(),
  designation: new DesignationController(),
  location: new LocationController(),
  vendor: new VendorController(),
  asset_category: new AssetCategoryController(),
};

export class AuditController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = body(req);
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
}
