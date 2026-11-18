export const STATUS = { INACTIVE: 0, ACTIVE: 1, DELETED: 2 } as const;

export const STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  VALIDATION_ERROR: 422,
  SERVER_ERROR: 500,
} as const;

export const STATUS_MESSAGES = {
  SUCCESS: 'Request has been completed successfully.',
  CREATED: 'Request has been created successfully.',
  BAD_REQUEST: 'Request line contained invalid characters.',
  UNAUTHORIZED: 'You are not authorized to access.',
  FORBIDDEN: 'You do not have sufficient permissions to perform this action.',
  NOT_FOUND: 'Resource associated with the request could not be found.',
  CONFLICT: 'Provided information already exists.',
  VALIDATION_ERROR: 'Validation error.',
  SERVER_ERROR: 'Request failed due to an internal error.',
  TOKEN_REQUIRED: 'Token is required.',
  TOKEN_INVALID: 'Your token is not valid.',
  USER_NOT_FOUND: 'User not found in our system.',
  PASSWORD_INCORRECT: 'Password is incorrect.',
  PASSWORD_MISMATCH: 'New password and confirmation do not match.',
  OTP_INCORRECT: 'OTP is incorrect.',
} as const;

export const MODULES = {
  USER: 'user',
  ROLE: 'role',
  EMPLOYEE: 'employee',
  DEPARTMENT: 'department',
  DESIGNATION: 'designation',
  LOCATION: 'location',
  VENDOR: 'vendor',
  ASSET_CATEGORY: 'asset_category',
  ASSET: 'asset',
  ASSET_ASSIGNMENT: 'asset_assignment',
  ASSET_MAINTENANCE: 'asset_maintenance',
  SOFTWARE: 'software',
  SOFTWARE_LICENSE: 'software_license',
  CREDENTIAL: 'credential',
  REQUEST: 'request',
  OFFBOARDING: 'offboarding',
  REPORT: 'report',
  AUDIT_LOG: 'audit_log',
  SETTING: 'setting',
  MODULE: 'module',
  PERMISSION: 'permission',
} as const;

export const ACCESS_TYPES = {
  READ: 'read_access',
  WRITE: 'write_access',
  DELETE: 'delete_access',
} as const;

export const ACTIVITY_MODULES = MODULES;
export const ACTIVITY_ACTIONS = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  STATUS_CHANGED: 'status_changed',
  PERMISSIONS_UPDATED: 'permissions_updated',
} as const;

export const RESOURCE_MODULES = {
  user: MODULES.USER,
  role: MODULES.ROLE,
  module: MODULES.MODULE,
  permission: MODULES.PERMISSION,
  employee: MODULES.EMPLOYEE,
  department: MODULES.DEPARTMENT,
  designation: MODULES.DESIGNATION,
  location: MODULES.LOCATION,
  vendor: MODULES.VENDOR,
  asset_category: MODULES.ASSET_CATEGORY,
} as const;
