import { designations } from '../Database/Schema';
import { MODULES } from '../Config/constant';
import type { CrudResourceDefinition } from '../Services/base_crud.service';

export const designationDefinition: CrudResourceDefinition = {
  table: 'designation',
  module: MODULES.DESIGNATION,
  writableFields: ['name', 'description', 'status'],
  searchFields: ['name'],
  optionFields: ['id', 'name'],
  filterableFields: { name: 'text', status: 'number' },
};

export const DesignationModel = designations;
