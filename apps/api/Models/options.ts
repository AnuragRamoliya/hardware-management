import { buildOptions } from '../Utils/options_builder';
import type { OptionsDto, OptionsResult } from '../Types/options';

const optionReaders = {
  user: buildOptions({
    schema: { table: 'users' },
    labelExpr: "TRIM(CONCAT_WS(' ', `first_name`, `last_name`))",
    subLabelField: 'email',
    searchFields: ['first_name', 'last_name', 'email'],
    allowedFilters: ['role_id'],
  }),
  employee: buildOptions({
    schema: { table: 'employees' },
    labelExpr: "TRIM(CONCAT_WS(' ', `first_name`, `last_name`))",
    subLabelField: 'employee_code',
    searchFields: ['search_text', 'employee_code', 'email'],
    allowedFilters: [
      'department_id',
      'designation_id',
      'location_id',
      'manager_id',
      'employment_status',
    ],
    defaultOrder: [
      { field: 'label_sort', direction: 'ASC' },
      { field: 'id', direction: 'ASC' },
    ],
  }),
  department: buildOptions({
    schema: { table: 'departments' },
    labelField: 'name',
    searchFields: ['name'],
    allowedFilters: [],
  }),
  designation: buildOptions({
    schema: { table: 'designations' },
    labelField: 'name',
    searchFields: ['name'],
    allowedFilters: [],
  }),
  location: buildOptions({
    schema: { table: 'locations' },
    labelField: 'name',
    subLabelField: 'address',
    searchFields: ['name'],
    allowedFilters: [],
  }),
  vendor: buildOptions({
    schema: { table: 'vendors' },
    labelField: 'name',
    subLabelField: 'email',
    searchFields: ['name', 'contact_name', 'email'],
    allowedFilters: [],
  }),
  asset: buildOptions({
    schema: { table: 'assets' },
    labelExpr: "TRIM(CONCAT_WS(' · ', `asset_tag`, `model`))",
    subLabelField: 'serial_no',
    searchFields: ['asset_tag', 'serial_no', 'brand', 'model'],
    allowedFilters: ['asset_status', 'category_id', 'vendor_id', 'location_id'],
    defaultOrder: [{ field: 'id', direction: 'DESC' }],
  }),
  software: buildOptions({
    schema: { table: 'software' },
    labelField: 'name',
    subLabelField: 'category',
    searchFields: ['name', 'category'],
    allowedFilters: ['category', 'license_type', 'vendor_id'],
  }),
  asset_category: buildOptions({
    schema: { table: 'asset_categories' },
    labelField: 'name',
    searchFields: ['name'],
    allowedFilters: [],
  }),
  role: buildOptions({
    schema: { table: 'roles' },
    labelField: 'name',
    subLabelField: 'type',
    searchFields: ['name', 'type'],
    allowedFilters: [],
  }),
  module: buildOptions({
    schema: { table: 'modules' },
    labelField: 'name',
    searchFields: ['name'],
    allowedFilters: [],
  }),
  permission: buildOptions({
    schema: { table: 'permissions' },
    labelExpr: "CONCAT('Role ', `role_id`, ' / Module ', `module_id`)",
    searchFields: ['role_id', 'module_id'],
    allowedFilters: ['role_id', 'module_id'],
  }),
  offboarding_template: buildOptions({
    schema: { table: 'offboarding_checklist_templates' },
    labelField: 'title',
    subLabelField: 'default_assignee_role',
    searchFields: ['title', 'description'],
    allowedFilters: ['is_mandatory', 'is_active'],
  }),
};

export type OptionsResource = keyof typeof optionReaders;

export function getOptions(resource: OptionsResource, input: OptionsDto): Promise<OptionsResult> {
  return optionReaders[resource](input);
}

export function isOptionsResource(resource: string): resource is OptionsResource {
  return Object.hasOwn(optionReaders, resource);
}
