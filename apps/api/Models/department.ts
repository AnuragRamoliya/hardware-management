import { departments } from '../Database/Schema';
import { sequelize } from '../Config/database';
import { MODULES } from '../Config/constant';
import type { CrudResourceDefinition } from '../Services/base_crud.service';

export const departmentDefinition: CrudResourceDefinition = {
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
};

export const DepartmentModel = departments;
