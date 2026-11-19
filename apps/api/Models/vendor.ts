import { vendors } from '../Database/Schema';
import { MODULES } from '../Config/constant';
import type { CrudResourceDefinition } from '../Services/base_crud.service';

export const vendorDefinition: CrudResourceDefinition = {
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
};

export const VendorModel = vendors;
