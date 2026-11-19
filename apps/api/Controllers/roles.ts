import type { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { AppError } from '../Config/app_error';
import { ACTIVITY_ACTIONS, MODULES, STATUS } from '../Config/constant';
import { sequelize } from '../Config/database';
import { modules, permissions, roles, type RowAttributes } from '../Database/Schema';
import { createActivityLog } from '../Utils/helpers';
import { BaseCrudController, getActor, getRequestBody } from './base_crud.controller';
import { BaseCrudService } from '../Services/base_crud.service';

export const roleDefinition = {
  table: 'role',
  module: MODULES.ROLE,
  writableFields: ['name', 'type', 'status'],
  searchFields: ['name', 'type'],
  optionFields: ['id', 'name', 'type'],
  filterableFields: { name: 'text', type: 'text', status: 'number' } as Record<
    string,
    'text' | 'number'
  >,
};

export class RoleController extends BaseCrudController {
  constructor() {
    super(new BaseCrudService(roles, roleDefinition), 'Role');
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
      const roleId = getActor(req).role_id;
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
      const input = getRequestBody(req);
      if (!Array.isArray(input.permissions))
        throw new AppError(422, 'permissions must be an array.');
      const permissionsInput = input.permissions as Array<Record<string, unknown>>;
      const actor = getActor(req);
      await sequelize.transaction(async (transaction) => {
        const role = await roles.findByPk(roleId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!role) throw new AppError(404, 'Role not found.');
        for (const item of permissionsInput) {
          const moduleId = Number(item.module_id);
          const mod = await modules.findByPk(moduleId, { transaction });
          if (!mod) throw new AppError(422, `Unknown module ID ${moduleId}.`);
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
            updated_by: actor.id,
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
          createdBy: actor.id,
          createdByName: `${actor.first_name} ${actor.last_name}`,
          transaction,
        });
      });
      res.handler.success(null, 'Role permissions updated successfully.');
    } catch (error) {
      next(error);
    }
  }
}
