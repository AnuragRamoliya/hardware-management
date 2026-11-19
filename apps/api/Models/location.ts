import { locations } from '../Database/Schema';
import { MODULES } from '../Config/constant';
import type { CrudResourceDefinition } from '../Services/base_crud.service';

export const locationDefinition: CrudResourceDefinition = {
  table: 'location',
  module: MODULES.LOCATION,
  writableFields: ['name', 'address', 'status'],
  searchFields: ['name', 'address'],
  optionFields: ['id', 'name'],
  filterableFields: { name: 'text', address: 'text', status: 'number' },
};

export const LocationModel = locations;
