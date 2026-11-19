import { MODULES } from '../Config/constant';
import { permissions } from '../Database/Schema';
import { BaseCrudController } from './base_crud.controller';
import { BaseCrudService } from '../Services/base_crud.service';

export const permissionDefinition = {
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
  } as Record<string, 'number' | 'boolean'>,
};

export class PermissionController extends BaseCrudController {
  constructor() {
    super(new BaseCrudService(permissions, permissionDefinition), 'Permission');
  }
}
