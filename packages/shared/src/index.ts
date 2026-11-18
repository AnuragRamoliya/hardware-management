/**
 * @hm/shared
 * Pure framework-free TypeScript contracts, types, and constants.
 */

// ============================================================================
// Core Enums & Constants
// ============================================================================

export const STATUS = {
  INACTIVE: 0,
  ACTIVE: 1,
  DELETED: 2,
} as const;

export type Status = (typeof STATUS)[keyof typeof STATUS];

export const STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
} as const;

export type StatusCode = (typeof STATUS_CODES)[keyof typeof STATUS_CODES];

export const STATUS_MESSAGES = {
  SUCCESS: "Request has been completed successfully.",
  CREATED: "Request has been created successfully.",
  BAD_REQUEST: "Request line contained invalid characters.",
  UNAUTHORIZED: "You are not authorized to access.",
  FORBIDDEN: "You do not have sufficient permissions to perform this action.",
  NOT_FOUND: "Resource associated with the request could not be found.",
  CONFLICT: "Provided information already exists.",
  VALIDATION_ERROR: "Validation error.",
  SERVER_ERROR: "Request failed due to an internal error.",
  TOKEN_REQUIRED: "Token is required.",
  TOKEN_INVALID: "Your token is not valid.",
  USER_NOT_FOUND: "User not found in our system.",
  PASSWORD_INCORRECT: "Password is incorrect.",
  PASSWORD_MISMATCH: "New password and confirmation do not match.",
  OTP_INCORRECT: "OTP is incorrect.",
} as const;

export const MODULES = {
  USER: "user",
  ROLE: "role",
  EMPLOYEE: "employee",
  DEPARTMENT: "department",
  DESIGNATION: "designation",
  LOCATION: "location",
  VENDOR: "vendor",
  ASSET_CATEGORY: "asset_category",
  ASSET: "asset",
  ASSET_ASSIGNMENT: "asset_assignment",
  ASSET_MAINTENANCE: "asset_maintenance",
  SOFTWARE: "software",
  SOFTWARE_LICENSE: "software_license",
  CREDENTIAL: "credential",
  REQUEST: "request",
  OFFBOARDING: "offboarding",
  REPORT: "report",
  AUDIT_LOG: "audit_log",
  SETTING: "setting",
  MODULE: "module",
  PERMISSION: "permission",
} as const;

export type ModuleKey = (typeof MODULES)[keyof typeof MODULES];

export const ACCESS_TYPES = {
  READ: "read_access",
  WRITE: "write_access",
  DELETE: "delete_access",
} as const;

export type AccessType = (typeof ACCESS_TYPES)[keyof typeof ACCESS_TYPES];

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  HARDWARE_MANAGER: "hardware_manager",
  HR: "hr",
  EMPLOYEE: "employee",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ACTIVITY_ACTIONS = {
  CREATED: "created",
  UPDATED: "updated",
  DELETED: "deleted",
  STATUS_CHANGED: "status_changed",
  PERMISSIONS_UPDATED: "permissions_updated",
} as const;

export type ActivityAction =
  (typeof ACTIVITY_ACTIONS)[keyof typeof ACTIVITY_ACTIONS];

export const EMPLOYMENT_STATUS = {
  ACTIVE: 1,
  NOTICE: 2,
  RESIGNED: 3,
  EXITED: 4,
} as const;

export type EmploymentStatus =
  (typeof EMPLOYMENT_STATUS)[keyof typeof EMPLOYMENT_STATUS];

export const ASSET_STATUS = {
  AVAILABLE: 1,
  ASSIGNED: 2,
  PENDING_RETURN: 3,
  IN_REPAIR: 4,
  RETIRED: 5,
  LOST: 6,
} as const;

export type AssetStatus = (typeof ASSET_STATUS)[keyof typeof ASSET_STATUS];

export const ASSET_CONDITIONS = ["new", "good", "fair", "poor"] as const;
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

export const SOFTWARE_CATEGORIES = [
  "productivity",
  "dev",
  "design",
  "security",
  "os",
] as const;
export type SoftwareCategory = (typeof SOFTWARE_CATEGORIES)[number];

export const SOFTWARE_LICENSE_TYPES = [
  "per_user",
  "per_seat",
  "subscription",
  "perpetual",
  "free",
] as const;
export type SoftwareLicenseType = (typeof SOFTWARE_LICENSE_TYPES)[number];

// ============================================================================
// API Contracts
// ============================================================================

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface ApiResult<T> {
  status: number;
  message: string;
  data?: T;
  ok?: boolean;
}

export interface Paginated<T> {
  rows: T[];
  count: number;
}

export interface ListRequest {
  currentPage?: number;
  itemsPerPage?: number;
  filters?: Record<string, unknown>;
  sortBy?: Array<{ id: string; value: "asc" | "desc" | "ASC" | "DESC" }>;
  general_search?: string;
}

export type OptionId = number | string;

export interface OptionsRequest {
  search?: string;
  page?: number;
  limit?: number;
  ids?: OptionId[];
  filters?: Record<string, unknown>;
}

export interface OptionItem {
  value: OptionId;
  label: string;
  subLabel?: string;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OptionsResponse {
  rows: OptionItem[];
  count: number;
  hasMore: boolean;
  page: number;
}

export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]> | string[];
}

// ============================================================================
// Shared DTO Interfaces
// ============================================================================

export interface EmployeeDto {
  id: number | string;
  first_name: string;
  last_name?: string;
  email: string;
  employee_code?: string;
  department_id?: number | string | null;
  designation_id?: number | string | null;
  location_id?: number | string | null;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetDto {
  id: number | string;
  asset_tag: string;
  name: string;
  category_id?: number | string | null;
  model_number?: string | null;
  serial_number?: string | null;
  status?: number;
  condition?: AssetCondition | string;
  assigned_to?: number | string | null;
  location_id?: number | string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SoftwareDto {
  id: number | string;
  name: string;
  vendor_id?: number | string | null;
  category?: SoftwareCategory | string;
  version?: string | null;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MaintenanceDto {
  id: number | string;
  asset_id: number | string;
  vendor_id?: number | string | null;
  issue_description?: string;
  status?: number;
  cost?: number | string | null;
  start_date?: string | null;
  end_date?: string | null;
}
