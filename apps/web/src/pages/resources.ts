import { endPoints } from "@/api/endpoint";
import type { ResourceConfig } from "@/pages/ResourcePage";
import { ENUMS } from "@/utils/constants";
import { RECORD_STATUS_FILTER } from "@/components/common/TableSelectFilter";

const nameColumn = { id: "name", label: "Name" };
const emailColumn = { id: "email", label: "Email" };
const statusColumn = { id: "status", label: "Status", type: "status" as const };
const activeField = {
  name: "status",
  label: "Status",
  type: "select" as const,
  options: [...ENUMS.recordStatus],
};

export const employeeConfig: ResourceConfig = {
  key: "employees",
  title: "Employees",
  singular: "Employee",
  endpoint: endPoints.employee.base,
  module: "employee",
  employee: true,
  description:
    "Manage your people, roles, and employee records from one place.",
  fields: [
    { name: "employee_code", label: "Employee ID", required: true },
    { name: "first_name", label: "First name", required: true },
    { name: "last_name", label: "Last name", required: true },
    { name: "email", label: "Work email", type: "email", required: true },
    {
      name: "department_id",
      label: "Department",
      type: "async-select",
      optionsResource: "department",
      clearable: true,
    },
    {
      name: "designation_id",
      label: "Designation",
      type: "async-select",
      optionsResource: "designation",
      clearable: true,
    },
    {
      name: "location_id",
      label: "Location",
      type: "async-select",
      optionsResource: "location",
      clearable: true,
    },
    {
      name: "manager_id",
      label: "Manager",
      type: "async-select",
      optionsResource: "employee",
      clearable: true,
    },
    {
      name: "create_login",
      label: "Create login account",
      type: "select",
      options: [...ENUMS.createLogin],
      onlyOnAdd: true,
    },
    {
      name: "login_password",
      label: "Login password (minimum 12 characters)",
      type: "password",
      minLength: 12,
      onlyOnAdd: true,
    },
    {
      name: "employment_status",
      label: "Employment status",
      type: "select",
      options: [...ENUMS.employmentStatus],
    },
    {
      name: "status",
      label: "Record status",
      type: "select",
      options: [...ENUMS.recordStatus],
    },
  ],
  columns: [
    { id: "employee_code", label: "Employee ID" },
    { id: "first_name", label: "Employee" },
    emailColumn,
    {
      id: "department_id",
      label: "Department",
      displayField: "department",
      displayResource: "department",
    },
    {
      id: "designation_id",
      label: "Designation",
      displayField: "designation",
      displayResource: "designation",
    },
    statusColumn,
  ],
  filters: [
    {
      key: "department_id",
      label: "Department",
      type: "async-select",
      endpoint: "department/options",
      multiple: true,
    },
    {
      key: "designation_id",
      label: "Designation",
      type: "async-select",
      endpoint: "designation/options",
      multiple: true,
    },
    {
      key: "location_id",
      label: "Location",
      type: "async-select",
      endpoint: "location/options",
      multiple: true,
    },
    {
      key: "manager_id",
      label: "Manager",
      type: "async-select",
      endpoint: "employee/options",
      multiple: true,
    },
    {
      key: "employment_status",
      label: "Employment status",
      type: "select",
      options: ENUMS.employmentStatus,
    },
    { key: "join_date", label: "Join date", type: "daterange" },
    { key: "status", label: "Record status", type: "status", options: ENUMS.recordStatus },
  ],
};
export const userConfig: ResourceConfig = {
  key: "users",
  title: "Users",
  singular: "User",
  endpoint: endPoints.user.base,
  module: "user",
  description: "Manage accounts and assign access to your ITAM workspace.",
  fields: [
    { name: "first_name", label: "First name", required: true },
    { name: "last_name", label: "Last name", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    {
      name: "role_id",
      label: "Role",
      type: "async-select",
      optionsResource: "role",
      required: true,
    },
    {
      name: "password",
      label: "Temporary password",
      type: "password",
      minLength: 12,
      requiredOnAdd: true,
      onlyOnAdd: true,
    },
    activeField,
  ],
  columns: [
    { id: "first_name", label: "Name" },
    emailColumn,
    {
      id: "role_id",
      label: "Role",
      displayField: "role",
      displayResource: "role",
    },
    statusColumn,
  ],
  filters: [
    { key: "role_id", label: "Role", type: "async-select", endpoint: "role/options", multiple: true },
    { key: "status", label: "Record status", type: "status", options: ENUMS.recordStatus },
  ],
};
export const roleConfig: ResourceConfig = {
  key: "roles",
  title: "Roles",
  singular: "Role",
  endpoint: endPoints.role.base,
  module: "role",
  description:
    "Define role access and keep permissions aligned with responsibilities.",
  fields: [
    { name: "name", label: "Role name", required: true },
    { name: "type", label: "Role type", required: true },
  ],
  columns: [
    nameColumn,
    { id: "description", label: "Description" },
    { id: "users_count", label: "Members" },
  ],
  filters: [RECORD_STATUS_FILTER],
};
export const departmentConfig: ResourceConfig = {
  key: "departments",
  title: "Departments",
  singular: "Department",
  endpoint: endPoints.department.base,
  module: "department",
  description: "Organize employees into teams and departments.",
  fields: [
    { name: "name", label: "Department name", required: true },
    { name: "description", label: "Description", type: "textarea" },
    activeField,
  ],
  columns: [
    nameColumn,
    { id: "employees_count", label: "Employees" },
    statusColumn,
  ],
  filters: [RECORD_STATUS_FILTER],
};
export const designationConfig: ResourceConfig = {
  key: "designations",
  title: "Designations",
  singular: "Designation",
  endpoint: endPoints.designation.base,
  module: "designation",
  description: "Maintain the job titles used across your organization.",
  fields: [
    { name: "name", label: "Designation", required: true },
    { name: "description", label: "Description", type: "textarea" },
    activeField,
  ],
  columns: [
    nameColumn,
    { id: "description", label: "Description" },
    statusColumn,
  ],
  filters: [RECORD_STATUS_FILTER],
};
export const locationConfig: ResourceConfig = {
  key: "locations",
  title: "Locations",
  singular: "Location",
  endpoint: endPoints.location.base,
  module: "location",
  description: "Keep office locations and sites up to date.",
  fields: [
    { name: "name", label: "Location name", required: true },
    { name: "address", label: "Address", type: "textarea" },
    activeField,
  ],
  columns: [nameColumn, statusColumn],
  filters: [RECORD_STATUS_FILTER],
};
export const vendorConfig: ResourceConfig = {
  key: "vendors",
  title: "Vendors",
  singular: "Vendor",
  endpoint: endPoints.vendor.base,
  module: "vendor",
  description: "Manage external suppliers and support partners.",
  fields: [
    { name: "name", label: "Vendor name", required: true },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone number" },
    { name: "contact_name", label: "Contact name" },
    { name: "address", label: "Address", type: "textarea" },
    activeField,
  ],
  columns: [
    nameColumn,
    emailColumn,
    { id: "phone", label: "Phone" },
    statusColumn,
  ],
  filters: [RECORD_STATUS_FILTER],
};
export const assetCategoryConfig: ResourceConfig = {
  key: "asset-categories",
  title: "Asset categories",
  singular: "Category",
  endpoint: endPoints.assetCategory.base,
  module: "asset_category",
  description: "Create categories to organize your organization's assets.",
  fields: [
    { name: "name", label: "Category name", required: true },
    { name: "description", label: "Description", type: "textarea" },
    activeField,
  ],
  columns: [
    nameColumn,
    { id: "description", label: "Description" },
    { id: "assets_count", label: "Assets" },
    statusColumn,
  ],
  filters: [RECORD_STATUS_FILTER],
};
export const auditConfig: ResourceConfig = {
  key: "audit-logs",
  title: "Audit logs",
  singular: "Audit log",
  endpoint: endPoints.audit.base,
  module: "audit_log",
  description: "Review a time-ordered record of important workspace activity.",
  fields: [],
  filters: [
    { key: "module_id", label: "Module", type: "async-select", endpoint: "module/options" },
    { key: "user_id", label: "User", type: "async-select", endpoint: "user/options" },
    {
      key: "action",
      label: "Action",
      type: "select",
      options: [
        { value: "created", label: "Created" },
        { value: "updated", label: "Updated" },
        { value: "deleted", label: "Deleted" },
        { value: "permissions_updated", label: "Permissions updated" },
      ],
    },
    { key: "createdAt", label: "Date range", type: "daterange" },
  ],
  columns: [
    { id: "created_at", label: "Time" },
    { id: "user_name", label: "User" },
    { id: "action", label: "Activity" },
    { id: "resource", label: "Area" },
  ],
};
