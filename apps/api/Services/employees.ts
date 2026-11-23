import { Op } from 'sequelize';
import { AppError } from '../Config/app_error';
import { ACTIVITY_ACTIONS, MODULES, STATUS } from '../Config/constant';
import { sequelize } from '../Config/database';
import {
  employees,
  roles,
  user_tokens,
  users,
  offboarding_cases,
  type RowAttributes,
} from '../Database/Schema';
import { ResourceModel, type ResourceDefinition } from '../Models/resource';
import { createActivityLog, createHashPassword } from '../Utils/helpers';
import type { UserInfo } from '../Types/api';
import type { OptionsDto, OptionsResult } from '../Types/options';
import { validatePhoneNumber } from '@hm/shared';

const employeeDefinition: ResourceDefinition = {
  table: 'employee',
  module: MODULES.EMPLOYEE,
  writableFields: [
    'employee_code',
    'first_name',
    'last_name',
    'email',
    'phone',
    'department_id',
    'designation_id',
    'manager_id',
    'location_id',
    'join_date',
    'last_working_date',
    'employment_status',
    'profile_image',
    'user_id',
  ],
  searchFields: ['employee_code', 'first_name', 'last_name', 'email', 'phone'],
  optionFields: ['id', 'employee_code', 'first_name', 'last_name', 'email'],
  filterableFields: {
    employee_code: 'text',
    first_name: 'text',
    last_name: 'text',
    email: 'text',
    phone: 'text',
    department_id: 'number',
    designation_id: 'number',
    manager_id: 'number',
    location_id: 'number',
    join_date: 'date',
    last_working_date: 'date',
    employment_status: 'number',
    status: 'number',
  },
};
const employeeFields = new Set(employeeDefinition.writableFields);

function plain(record: import('sequelize').Model): RowAttributes {
  return record.get({ plain: true }) as RowAttributes;
}

export class EmployeeService {
  private readonly resource = new ResourceModel(employees, employeeDefinition);

  async add(input: Record<string, unknown>, actor: UserInfo): Promise<RowAttributes> {
    return sequelize.transaction(async (transaction) => {
      let userId: number | null = null;
      const email = String(input.email).trim().toLowerCase();
      if (input.create_login === true) {
        if (typeof input.login_password !== 'string' || input.login_password.length < 12) {
          throw new AppError(
            422,
            'login_password must be at least 12 characters when create_login is true.',
          );
        }
        const duplicate = await users.findOne({
          where: { email, status: STATUS.ACTIVE },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (duplicate) throw new AppError(409, 'Email already belongs to an active user.');
        const employeeRole = await roles.findOne({
          where: { type: 'employee', status: STATUS.ACTIVE },
          transaction,
        });
        if (!employeeRole) throw new AppError(500, 'Employee role is not configured.');
        const roleId = Number(plain(employeeRole).id);
        const newUser = await users.create(
          {
            role_id: roleId,
            first_name: input.first_name,
            last_name: input.last_name,
            email,
            password: await createHashPassword(String(input.login_password)),
            status: STATUS.ACTIVE,
            created_by: actor.id,
          },
          { transaction },
        );
        userId = Number(plain(newUser).id);
        await createActivityLog({
          module: MODULES.USER,
          moduleId: userId,
          action: ACTIVITY_ACTIONS.CREATED,
          newValue: { id: userId, email },
          description: `User ${userId} was created with employee`,
          createdBy: actor.id,
          createdByName: `${actor.first_name} ${actor.last_name}`,
          transaction,
        });
      }
      if (
        input.employment_status !== undefined &&
        ![1, 2, 3, 4].includes(Number(input.employment_status))
      ) {
        throw new AppError(422, 'employment_status must be between 1 and 4.');
      }

      if (input.phone && typeof input.phone === 'string' && input.phone.trim()) {
        const phoneValidation = validatePhoneNumber(input.phone, 'IN');
        if (phoneValidation.valid && phoneValidation.e164) {
          input.phone = phoneValidation.e164;
        }
      }

      const employee = await employees.create(
        {
          ...Object.fromEntries(
            Object.entries(input).filter(([field]) => employeeFields.has(field)),
          ),
          email,
          user_id: userId,
          status: STATUS.ACTIVE,
          created_by: actor.id,
        },
        { transaction },
      );
      const data = plain(employee);
      await createActivityLog({
        module: MODULES.EMPLOYEE,
        moduleId: Number(data.id),
        action: ACTIVITY_ACTIONS.CREATED,
        newValue: data,
        description: `Employee ${String(data.id)} was created`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name}`,
        transaction,
      });
      return data;
    });
  }

  async update(input: Record<string, unknown>, actor: UserInfo): Promise<RowAttributes> {
    return this.resource.update(input, actor);
  }

  async get(id: number): Promise<RowAttributes> {
    const data = await this.resource.get(id);
    const activeCase = await offboarding_cases.findOne({
      where: { employee_id: id, status: 1 },
      order: [['id', 'DESC']],
    });
    if (activeCase) {
      data.offboarding = {
        id: Number(activeCase.get('id')),
        case_no: String(activeCase.get('case_no')),
        case_status: Number(activeCase.get('case_status')),
        last_working_date: String(activeCase.get('last_working_date')),
      };
    }
    return data;
  }

  async list(
    input: import('../Types/api').ListDto,
    options = false,
  ): Promise<{ rows: RowAttributes[]; count: number }> {
    return this.resource.list(input, options);
  }

  async options(input: OptionsDto): Promise<OptionsResult> {
    return this.resource.options(input);
  }

  async delete(id: number, actor: UserInfo): Promise<void> {
    await sequelize.transaction(async (transaction) => {
      const employee = await employees.findOne({
        where: { id, status: { [Op.ne]: STATUS.DELETED } },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!employee) throw new AppError(404, 'Employee not found.');

      // Block delete if an open offboarding case exists
      const openCase = await offboarding_cases.findOne({
        where: {
          employee_id: id,
          case_status: { [Op.in]: [1, 2, 3] },
          status: 1,
        },
        transaction,
      });
      if (openCase) {
        throw new AppError(422, 'Cannot delete employee with an active offboarding case.');
      }
      const data = plain(employee);
      await employee.update({ status: STATUS.DELETED, updated_by: actor.id }, { transaction });
      if (data.user_id) {
        await users.update(
          { status: STATUS.DELETED, updated_by: actor.id },
          { where: { id: data.user_id, status: { [Op.ne]: STATUS.DELETED } }, transaction },
        );
        await user_tokens.destroy({ where: { user_id: data.user_id }, transaction });
      }
      await createActivityLog({
        module: MODULES.EMPLOYEE,
        moduleId: id,
        action: ACTIVITY_ACTIONS.DELETED,
        oldValue: 1,
        newValue: STATUS.DELETED,
        description: `Employee ${id} was soft deleted`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name}`,
        transaction,
      });
    });
  }
}
