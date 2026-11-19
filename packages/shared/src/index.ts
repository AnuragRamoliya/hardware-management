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
  REAUTH_REQUIRED: "Re-authentication is required to access sensitive data.",
  REAUTH_EXPIRED:
    "Re-authentication window has expired. Please re-authenticate.",
  CONSENT_REQUIRED:
    "Employee consent agreement must be accepted before submitting credentials.",
  ACCOUNT_LOCKED:
    "Account temporarily locked due to consecutive failed attempts. Try again later.",
  RATE_LIMITED: "Too many attempts. Please try again later.",
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
  CREDENTIAL_TYPE: "credential_type",
  CREDENTIAL_COLLECTION_REQUEST: "credential_collection_request",
  CREDENTIAL_ACCESS_LOG: "credential_access_log",
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
  APPROVE: "approve_access",
  REVEAL: "reveal_access",
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
  REVEALED: "revealed",
  APPROVED: "approved",
  REJECTED: "rejected",
  NEEDS_CHANGE: "needs_change",
  REQUESTED: "requested",
  FULFILLED: "fulfilled",
  ASSIGNED: "assigned",
  CLOSED: "closed",
  CANCELLED: "cancelled",
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
// Phase 3: Credential Vault Enums & Constants
// ============================================================================

export const CREDENTIAL_CATEGORIES = [
  "email",
  "vpn",
  "source_control",
  "project_tool",
  "cloud",
  "laptop",
  "wifi",
  "database",
  "other",
] as const;
export type CredentialCategory = (typeof CREDENTIAL_CATEGORIES)[number];

export const PROVIDED_BY = {
  COMPANY: 1,
  EMPLOYEE: 2,
} as const;
export type ProvidedByType = (typeof PROVIDED_BY)[keyof typeof PROVIDED_BY];

export const CREDENTIAL_APPROVAL_STATUS = {
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
  NEEDS_CHANGE: 4,
} as const;
export type CredentialApprovalStatus =
  (typeof CREDENTIAL_APPROVAL_STATUS)[keyof typeof CREDENTIAL_APPROVAL_STATUS];

export const COLLECTION_REQUEST_STATUS = {
  OPEN: 1,
  PENDING: 1,
  SUBMITTED: 2,
  FULFILLED: 2,
  OVERDUE: 3,
  CANCELLED: 4,
} as const;
export type CollectionRequestStatus =
  (typeof COLLECTION_REQUEST_STATUS)[keyof typeof COLLECTION_REQUEST_STATUS];

export const CREDENTIAL_ACCESS_ACTION = {
  REVEAL: "reveal",
  COPY: "copy",
  EXPORT: "export",
  REVEAL_DENIED: "reveal_denied",
} as const;
export type CredentialAccessAction =
  (typeof CREDENTIAL_ACCESS_ACTION)[keyof typeof CREDENTIAL_ACCESS_ACTION];

export const CREDENTIAL_CHANGE_TYPE = {
  CREATED: "created",
  SUBMITTED: "submitted",
  UPDATED: "details_updated",
  DETAILS_UPDATED: "details_updated",
  PASSWORD_CHANGED: "password_changed",
  PASSWORD_UPDATE: "password_changed",
  APPROVED: "approved",
  REJECTED: "rejected",
  NEEDS_CHANGE: "needs_change",
  EXPIRED: "expired",
  REASSIGNED: "reassigned",
  REVOKED: "revoked",
} as const;
export type CredentialChangeType =
  (typeof CREDENTIAL_CHANGE_TYPE)[keyof typeof CREDENTIAL_CHANGE_TYPE];

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

// ============================================================================
// Phase 3 Credential DTOs (Guaranteed Zero Secret Leakage)
// ============================================================================

export interface CredentialTypeDto {
  id: number;
  name: string;
  category: CredentialCategory;
  icon?: string | null;
  expiry_days?: number | null;
  min_length: number;
  require_complexity: boolean;
  requires_approval: boolean;
  allow_employee_submit: boolean;
  notes?: string | null;
  status: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CredentialDto {
  id: number;
  employee_id: number;
  credential_type_id: number;
  software_id?: number | null;
  asset_id?: number | null;
  label: string;
  username: string;
  url?: string | null;
  notes?: string | null;
  provided_by: ProvidedByType;
  approval_status: CredentialApprovalStatus;
  submitted_at?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  review_feedback?: string | null;
  must_change_on_first_use: boolean;
  expires_at?: string | null;
  last_changed_at?: string | null;
  last_revealed_at?: string | null;
  status: number;
  createdAt?: string;
  updatedAt?: string;
  // Associated entities for hydration
  employee?: {
    id: number;
    first_name: string;
    last_name?: string;
    email: string;
    employee_code?: string;
  };
  credential_type?: CredentialTypeDto;
  software?: { id: number; name: string };
  asset?: { id: number; asset_tag: string; brand?: string; model?: string };
  reviewer?: { id: number; first_name: string; last_name?: string };
}

export interface CredentialHistoryDto {
  id: number;
  credential_id: number;
  changed_by: number;
  change_type: CredentialChangeType;
  meta?: Record<string, unknown> | null;
  created_at: string;
  user?: { id: number; first_name: string; last_name?: string };
}

export interface CredentialCollectionRequestDto {
  id: number;
  employee_id: number;
  credential_type_id: number;
  requested_by: number;
  message?: string | null;
  due_date: string;
  request_status: CollectionRequestStatus;
  credential_id?: number | null;
  fulfilled_at?: string | null;
  status: number;
  createdAt?: string;
  updatedAt?: string;
  employee?: {
    id: number;
    first_name: string;
    last_name?: string;
    email: string;
    employee_code?: string;
  };
  credential_type?: CredentialTypeDto;
  requester?: { id: number; first_name: string; last_name?: string };
}

export interface CredentialAccessLogDto {
  id: number;
  credential_id: number;
  employee_id: number;
  accessed_by: number;
  action: CredentialAccessAction;
  reason?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  success: boolean;
  failure_reason?: string | null;
  accessed_at: string;
  prev_hash: string;
  hash: string;
  credential?: { id: number; label: string; username: string };
  employee?: {
    id: number;
    first_name: string;
    last_name?: string;
    employee_code?: string;
    email?: string;
  };
  accessor?: {
    id: number;
    first_name: string;
    last_name?: string;
    email?: string;
  };
}

export interface LoginHistoryDto {
  id: number;
  user_id?: number | null;
  email_attempted: string;
  success: boolean;
  ip_address?: string | null;
  user_agent?: string | null;
  device_name?: string | null;
  failure_reason?: string | null;
  created_at: string;
  user?: { id: number; first_name: string; last_name?: string };
}

export interface UserSessionDto {
  id: number | string;
  user_id: number;
  ip_address?: string | null;
  user_agent?: string | null;
  device_name?: string | null;
  created_at: string;
  last_active_at?: string | null;
  is_current?: boolean;
}

export interface ReauthRequest {
  password: string;
}

export interface ReauthResponse {
  reauth_token: string;
  expires_in_seconds: number;
}

export interface RevealSecretRequest {
  id?: number;
  reauth_token: string;
  reason?: string;
}

export interface RevealSecretResponse {
  id: number;
  secret: string;
  password?: string;
  expires_in_seconds: number;
}

export interface ConsentStatusResponse {
  consented?: boolean;
  consent_accepted?: boolean;
  consented_at?: string | null;
  policy_version?: string | null;
  policy_text?: string | null;
}

export interface AuditVerificationResult {
  valid?: boolean;
  total_records?: number;
  broken_at_id?: number | null;
  details?: string;
  accessLogsValid?: boolean;
  totalAccessLogsVerified?: number;
  accessLogsError?: string | null;
  activityLogsValid?: boolean;
  totalActivityLogsVerified?: number;
  activityLogsError?: string | null;
}

// ============================================================================
// Phase 4: Employee Requests & Review Workflow Enums & Constants
// ============================================================================

export const REQUEST_TYPE = {
  NEW_HARDWARE: 1,
  CHANGE_REPLACE_HARDWARE: 2,
  REPAIR: 3,
  SOFTWARE_ACCESS: 4,
  RETURN_HARDWARE: 5,
} as const;

export type RequestType = (typeof REQUEST_TYPE)[keyof typeof REQUEST_TYPE];

export const REQUEST_TYPE_NAMES: Record<RequestType, string> = {
  [REQUEST_TYPE.NEW_HARDWARE]: "new_hardware",
  [REQUEST_TYPE.CHANGE_REPLACE_HARDWARE]: "change_replace_hardware",
  [REQUEST_TYPE.REPAIR]: "repair",
  [REQUEST_TYPE.SOFTWARE_ACCESS]: "software_access",
  [REQUEST_TYPE.RETURN_HARDWARE]: "return_hardware",
};

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  [REQUEST_TYPE.NEW_HARDWARE]: "New Hardware",
  [REQUEST_TYPE.CHANGE_REPLACE_HARDWARE]: "Change / Replace Hardware",
  [REQUEST_TYPE.REPAIR]: "Repair",
  [REQUEST_TYPE.SOFTWARE_ACCESS]: "Software Access",
  [REQUEST_TYPE.RETURN_HARDWARE]: "Return Hardware",
};

export const REQUEST_STATUS = {
  SUBMITTED: 1,
  UNDER_REVIEW: 2,
  NEED_INFO: 3,
  APPROVED: 4,
  REJECTED: 5,
  FULFILLED: 6,
  CLOSED: 7,
  CANCELLED: 8,
  PENDING_MANAGER_APPROVAL: 9,
} as const;

export type RequestStatus =
  (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

export const REQUEST_STATUS_NAMES: Record<RequestStatus, string> = {
  [REQUEST_STATUS.SUBMITTED]: "submitted",
  [REQUEST_STATUS.UNDER_REVIEW]: "under_review",
  [REQUEST_STATUS.NEED_INFO]: "need_info",
  [REQUEST_STATUS.APPROVED]: "approved",
  [REQUEST_STATUS.REJECTED]: "rejected",
  [REQUEST_STATUS.FULFILLED]: "fulfilled",
  [REQUEST_STATUS.CLOSED]: "closed",
  [REQUEST_STATUS.CANCELLED]: "cancelled",
  [REQUEST_STATUS.PENDING_MANAGER_APPROVAL]: "pending_manager_approval",
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  [REQUEST_STATUS.SUBMITTED]: "Submitted",
  [REQUEST_STATUS.UNDER_REVIEW]: "Under Review",
  [REQUEST_STATUS.NEED_INFO]: "Need Info",
  [REQUEST_STATUS.APPROVED]: "Approved",
  [REQUEST_STATUS.REJECTED]: "Rejected",
  [REQUEST_STATUS.FULFILLED]: "Fulfilled",
  [REQUEST_STATUS.CLOSED]: "Closed",
  [REQUEST_STATUS.CANCELLED]: "Cancelled",
  [REQUEST_STATUS.PENDING_MANAGER_APPROVAL]: "Pending Manager Approval",
};

export const REQUEST_STATUS_TONES: Record<
  RequestStatus,
  "info" | "warning" | "purple" | "success" | "danger" | "muted"
> = {
  [REQUEST_STATUS.SUBMITTED]: "info",
  [REQUEST_STATUS.UNDER_REVIEW]: "warning",
  [REQUEST_STATUS.NEED_INFO]: "purple",
  [REQUEST_STATUS.APPROVED]: "success",
  [REQUEST_STATUS.REJECTED]: "danger",
  [REQUEST_STATUS.FULFILLED]: "success",
  [REQUEST_STATUS.CLOSED]: "muted",
  [REQUEST_STATUS.CANCELLED]: "muted",
  [REQUEST_STATUS.PENDING_MANAGER_APPROVAL]: "warning",
};

export const REQUEST_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
} as const;

export type RequestPriority =
  (typeof REQUEST_PRIORITY)[keyof typeof REQUEST_PRIORITY];

export const REQUEST_PRIORITY_NAMES: Record<RequestPriority, string> = {
  [REQUEST_PRIORITY.LOW]: "low",
  [REQUEST_PRIORITY.MEDIUM]: "medium",
  [REQUEST_PRIORITY.HIGH]: "high",
  [REQUEST_PRIORITY.URGENT]: "urgent",
};

export const REQUEST_PRIORITY_LABELS: Record<RequestPriority, string> = {
  [REQUEST_PRIORITY.LOW]: "Low",
  [REQUEST_PRIORITY.MEDIUM]: "Medium",
  [REQUEST_PRIORITY.HIGH]: "High",
  [REQUEST_PRIORITY.URGENT]: "Urgent",
};

export const REQUEST_PRIORITY_TONES: Record<
  RequestPriority,
  "muted" | "info" | "warning" | "danger"
> = {
  [REQUEST_PRIORITY.LOW]: "muted",
  [REQUEST_PRIORITY.MEDIUM]: "info",
  [REQUEST_PRIORITY.HIGH]: "warning",
  [REQUEST_PRIORITY.URGENT]: "danger",
};

/**
 * Valid state transitions for employee requests
 * Pure data representation mirrored from Services/request_workflow.service.ts
 */
export const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [REQUEST_STATUS.SUBMITTED]: [
    REQUEST_STATUS.UNDER_REVIEW,
    REQUEST_STATUS.REJECTED,
    REQUEST_STATUS.CANCELLED,
  ],
  [REQUEST_STATUS.UNDER_REVIEW]: [
    REQUEST_STATUS.APPROVED,
    REQUEST_STATUS.REJECTED,
    REQUEST_STATUS.NEED_INFO,
    REQUEST_STATUS.CANCELLED,
  ],
  [REQUEST_STATUS.NEED_INFO]: [
    REQUEST_STATUS.SUBMITTED,
    REQUEST_STATUS.CANCELLED,
  ],
  [REQUEST_STATUS.APPROVED]: [
    REQUEST_STATUS.FULFILLED,
    REQUEST_STATUS.REJECTED,
    REQUEST_STATUS.CANCELLED,
  ],
  [REQUEST_STATUS.FULFILLED]: [REQUEST_STATUS.CLOSED],
  [REQUEST_STATUS.REJECTED]: [],
  [REQUEST_STATUS.CLOSED]: [],
  [REQUEST_STATUS.CANCELLED]: [],
  [REQUEST_STATUS.PENDING_MANAGER_APPROVAL]: [
    REQUEST_STATUS.SUBMITTED,
    REQUEST_STATUS.REJECTED,
    REQUEST_STATUS.CANCELLED,
  ],
};

export interface RequestAttachmentDto {
  id: number;
  request_id: number;
  file_name: string;
  file_path: string;
  mime_type: string;
  size: number;
  uploaded_by: number;
  createdAt?: string;
  updatedAt?: string;
  uploader?: { id: number; first_name: string; last_name?: string };
}

export interface RequestCommentDto {
  id: number;
  request_id: number;
  user_id: number;
  comment: string;
  is_internal: boolean;
  createdAt?: string;
  updatedAt?: string;
  author?: {
    id: number;
    first_name: string;
    last_name?: string;
    email?: string;
    role?: { id: number; name: string };
  };
}

export interface RequestStatusHistoryDto {
  id: number;
  request_id: number;
  from_status: RequestStatus;
  to_status: RequestStatus;
  changed_by: number;
  note?: string | null;
  created_at?: string;
  createdAt?: string;
  changer?: { id: number; first_name: string; last_name?: string };
  user?: { id: number; first_name: string; last_name?: string };
}

export interface RequestDto {
  id: number;
  request_no: string;
  employee_id: number;
  request_type: RequestType;
  category_id?: number | null;
  current_asset_id?: number | null;
  software_id?: number | null;
  title: string;
  reason: string;
  priority: RequestPriority;
  needed_by_date?: string | null;
  request_status: RequestStatus;
  assigned_to?: number | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  decision_feedback?: string | null;
  awaiting_stock: boolean;
  assigned_asset_id?: number | null;
  assigned_license_id?: number | null;
  fulfilled_at?: string | null;
  fulfilled_by?: number | null;
  closed_at?: string | null;
  sla_due_at?: string | null;
  sla_breached: boolean;
  cancelled_reason?: string | null;
  status: number;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: number;
    first_name: string;
    last_name?: string;
    email: string;
    employee_code?: string;
    department?: { id: number; name: string };
    designation?: { id: number; name: string };
    location?: { id: number; name: string };
  };
  category?: { id: number; name: string };
  current_asset?: {
    id: number;
    asset_tag: string;
    brand?: string;
    model?: string;
    serial_number?: string;
    category?: { id: number; name: string };
  };
  software?: { id: number; name: string; category?: string };
  assigned_asset?: {
    id: number;
    asset_tag: string;
    brand?: string;
    model?: string;
    serial_number?: string;
  };
  assigned_license?: {
    id: number;
    software_id: number;
    license_key?: string;
    seats_total?: number;
    seats_used?: number;
  };
  reviewer?: {
    id: number;
    first_name: string;
    last_name?: string;
    email?: string;
  };
  assignee?: {
    id: number;
    first_name: string;
    last_name?: string;
    email?: string;
  };
  fulfiller?: { id: number; first_name: string; last_name?: string };
  comments?: RequestCommentDto[];
  attachments?: RequestAttachmentDto[];
  history?: RequestStatusHistoryDto[];
}

export interface PortalRequestDto {
  id: number;
  request_no: string;
  request_type: RequestType;
  category_id?: number | null;
  current_asset_id?: number | null;
  software_id?: number | null;
  title: string;
  reason: string;
  priority: RequestPriority;
  needed_by_date?: string | null;
  request_status: RequestStatus;
  decision_feedback?: string | null;
  awaiting_stock: boolean;
  assigned_asset_id?: number | null;
  assigned_license_id?: number | null;
  fulfilled_at?: string | null;
  closed_at?: string | null;
  sla_due_at?: string | null;
  sla_breached: boolean;
  cancelled_reason?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: { id: number; name: string };
  current_asset?: {
    id: number;
    asset_tag: string;
    brand?: string;
    model?: string;
    category?: { id: number; name: string };
  };
  software?: { id: number; name: string; category?: string };
  assigned_asset?: {
    id: number;
    asset_tag: string;
    brand?: string;
    model?: string;
  };
  comments?: RequestCommentDto[];
  attachments?: RequestAttachmentDto[];
  history?: RequestStatusHistoryDto[];
}

export interface RequestStatsDto {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  sla_breaches: number;
  awaiting_stock: number;
  unassigned: number;
  mine: number;
  needs_attention: number;
  avg_turnaround_hours: number;
}
