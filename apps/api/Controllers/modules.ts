import { MODULES } from '../Config/constant';
import { modules } from '../Database/Schema';
import { BaseCrudController } from './base_crud.controller';
import { BaseCrudService } from '../Services/base_crud.service';

export const moduleDefinition = {
  table: 'module',
  module: MODULES.MODULE,
  writableFields: ['name', 'sortOrder', 'status'],
  searchFields: ['name'],
  optionFields: ['id', 'name'],
  filterableFields: { name: 'text', status: 'number' } as Record<string, 'text' | 'number'>,
};

export class ModuleController extends BaseCrudController {
  constructor() {
    super(new BaseCrudService(modules, moduleDefinition), 'Module');
  }
}
