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
  OFFBOARDING_TEMPLATE: "offboarding_template",
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

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  [EMPLOYMENT_STATUS.ACTIVE]: "Active",
  [EMPLOYMENT_STATUS.NOTICE]: "In Notice",
  [EMPLOYMENT_STATUS.RESIGNED]: "Resigned",
  [EMPLOYMENT_STATUS.EXITED]: "Exited",
};

export const EMPLOYMENT_STATUS_TONES: Record<
  EmploymentStatus,
  "success" | "warning" | "secondary" | "destructive"
> = {
  [EMPLOYMENT_STATUS.ACTIVE]: "success",
  [EMPLOYMENT_STATUS.NOTICE]: "warning",
  [EMPLOYMENT_STATUS.RESIGNED]: "secondary",
  [EMPLOYMENT_STATUS.EXITED]: "destructive",
};

export const ASSET_STATUS = {
  AVAILABLE: 1,
  ASSIGNED: 2,
  PENDING_RETURN: 3,
  IN_REPAIR: 4,
  UNDER_REPAIR: 4,
  RETIRED: 5,
  LOST: 6,
} as const;

export const USER_STATUS = {
  INACTIVE: 0,
  ACTIVE: 1,
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const TOKEN_REVOCATION = {
  ACTIVE: 0,
  REVOKED: 1,
} as const;

export type TokenRevocation =
  (typeof TOKEN_REVOCATION)[keyof typeof TOKEN_REVOCATION];

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

// ============================================================================
// Phase 5: Offboarding & Hardware Handover Enums, Maps & Types
// ============================================================================

export const OFFBOARDING_CASE_STATUS = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  PENDING_CLEARANCE: "pending_clearance",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type OffboardingCaseStatus =
  (typeof OFFBOARDING_CASE_STATUS)[keyof typeof OFFBOARDING_CASE_STATUS];

export const OFFBOARDING_TASK_TYPE = {
  ASSET: "asset",
  SOFTWARE: "software",
  CREDENTIAL: "credential",
  REQUEST: "request",
  CHECKLIST: "checklist",
} as const;

export type OffboardingTaskType =
  (typeof OFFBOARDING_TASK_TYPE)[keyof typeof OFFBOARDING_TASK_TYPE];

export const OFFBOARDING_TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  WAIVED: "waived",
  EXCEPTION: "exception",
  CANCELLED: "cancelled",
} as const;

export type OffboardingTaskStatus =
  (typeof OFFBOARDING_TASK_STATUS)[keyof typeof OFFBOARDING_TASK_STATUS];

export const TASK_PRIORITY = {
  LOW: "low",
  STANDARD: "standard",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type TaskPriority = (typeof TASK_PRIORITY)[keyof typeof TASK_PRIORITY];

export const NUMERIC_TO_CASE_STATUS: Record<number, OffboardingCaseStatus> = {
  1: OFFBOARDING_CASE_STATUS.OPEN,
  2: OFFBOARDING_CASE_STATUS.IN_PROGRESS,
  3: OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE,
  4: OFFBOARDING_CASE_STATUS.COMPLETED,
  5: OFFBOARDING_CASE_STATUS.CANCELLED,
};

export const CASE_STATUS_TO_NUMERIC: Record<OffboardingCaseStatus, number> = {
  [OFFBOARDING_CASE_STATUS.OPEN]: 1,
  [OFFBOARDING_CASE_STATUS.IN_PROGRESS]: 2,
  [OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE]: 3,
  [OFFBOARDING_CASE_STATUS.COMPLETED]: 4,
  [OFFBOARDING_CASE_STATUS.CANCELLED]: 5,
};

export const NUMERIC_TO_TASK_TYPE: Record<number, OffboardingTaskType> = {
  1: OFFBOARDING_TASK_TYPE.ASSET,
  2: OFFBOARDING_TASK_TYPE.SOFTWARE,
  3: OFFBOARDING_TASK_TYPE.CREDENTIAL,
  4: OFFBOARDING_TASK_TYPE.REQUEST,
  5: OFFBOARDING_TASK_TYPE.CHECKLIST,
};

export const TASK_TYPE_TO_NUMERIC: Record<OffboardingTaskType, number> = {
  [OFFBOARDING_TASK_TYPE.ASSET]: 1,
  [OFFBOARDING_TASK_TYPE.SOFTWARE]: 2,
  [OFFBOARDING_TASK_TYPE.CREDENTIAL]: 3,
  [OFFBOARDING_TASK_TYPE.REQUEST]: 4,
  [OFFBOARDING_TASK_TYPE.CHECKLIST]: 5,
};

export const NUMERIC_TO_TASK_STATUS: Record<number, OffboardingTaskStatus> = {
  1: OFFBOARDING_TASK_STATUS.PENDING,
  2: OFFBOARDING_TASK_STATUS.IN_PROGRESS,
  3: OFFBOARDING_TASK_STATUS.COMPLETED,
  4: OFFBOARDING_TASK_STATUS.WAIVED,
  5: OFFBOARDING_TASK_STATUS.EXCEPTION,
  6: OFFBOARDING_TASK_STATUS.CANCELLED,
};

export const TASK_STATUS_TO_NUMERIC: Record<OffboardingTaskStatus, number> = {
  [OFFBOARDING_TASK_STATUS.PENDING]: 1,
  [OFFBOARDING_TASK_STATUS.IN_PROGRESS]: 2,
  [OFFBOARDING_TASK_STATUS.COMPLETED]: 3,
  [OFFBOARDING_TASK_STATUS.WAIVED]: 4,
  [OFFBOARDING_TASK_STATUS.EXCEPTION]: 5,
  [OFFBOARDING_TASK_STATUS.CANCELLED]: 6,
};

export const NUMERIC_TO_PRIORITY: Record<number, TaskPriority> = {
  1: TASK_PRIORITY.LOW,
  2: TASK_PRIORITY.STANDARD,
  3: TASK_PRIORITY.HIGH,
  4: TASK_PRIORITY.URGENT,
};

export const PRIORITY_TO_NUMERIC: Record<TaskPriority, number> = {
  [TASK_PRIORITY.LOW]: 1,
  [TASK_PRIORITY.STANDARD]: 2,
  [TASK_PRIORITY.HIGH]: 3,
  [TASK_PRIORITY.URGENT]: 4,
};

export const OFFBOARDING_EXIT_TYPE = {
  RESIGNATION: 1,
  TERMINATION: 2,
  RETIREMENT: 3,
  CONTRACT_END: 4,
  OTHER: 5,
} as const;

export type OffboardingExitType =
  (typeof OFFBOARDING_EXIT_TYPE)[keyof typeof OFFBOARDING_EXIT_TYPE];

export const OFFBOARDING_RETURN_CONDITION = {
  GOOD: "good",
  FAIR: "fair",
  POOR: "poor",
  DAMAGED: "damaged",
  MISSING: "missing",
} as const;

export type OffboardingReturnCondition =
  (typeof OFFBOARDING_RETURN_CONDITION)[keyof typeof OFFBOARDING_RETURN_CONDITION];

export const OFFBOARDING_TO_STATUS = {
  AVAILABLE: "available",
  IN_REPAIR: "in_repair",
  RETIRED: "retired",
  LOST: "lost",
} as const;

export type OffboardingToStatus =
  (typeof OFFBOARDING_TO_STATUS)[keyof typeof OFFBOARDING_TO_STATUS];

// Label & Tone Maps

export const CASE_STATUS_LABELS: Record<OffboardingCaseStatus, string> = {
  [OFFBOARDING_CASE_STATUS.OPEN]: "Open",
  [OFFBOARDING_CASE_STATUS.IN_PROGRESS]: "In Progress",
  [OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE]: "Pending Clearance",
  [OFFBOARDING_CASE_STATUS.COMPLETED]: "Completed",
  [OFFBOARDING_CASE_STATUS.CANCELLED]: "Cancelled",
};

export const CASE_STATUS_NAMES: Record<OffboardingCaseStatus, string> = {
  [OFFBOARDING_CASE_STATUS.OPEN]: "open",
  [OFFBOARDING_CASE_STATUS.IN_PROGRESS]: "in_progress",
  [OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE]: "pending_clearance",
  [OFFBOARDING_CASE_STATUS.COMPLETED]: "completed",
  [OFFBOARDING_CASE_STATUS.CANCELLED]: "cancelled",
};

export const CASE_STATUS_TONES: Record<
  OffboardingCaseStatus,
  "info" | "warning" | "success" | "secondary" | "destructive"
> = {
  [OFFBOARDING_CASE_STATUS.OPEN]: "info",
  [OFFBOARDING_CASE_STATUS.IN_PROGRESS]: "warning",
  [OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE]: "warning",
  [OFFBOARDING_CASE_STATUS.COMPLETED]: "success",
  [OFFBOARDING_CASE_STATUS.CANCELLED]: "secondary",
};

export const TASK_TYPE_LABELS: Record<OffboardingTaskType, string> = {
  [OFFBOARDING_TASK_TYPE.ASSET]: "Hardware Asset",
  [OFFBOARDING_TASK_TYPE.SOFTWARE]: "Software License",
  [OFFBOARDING_TASK_TYPE.CREDENTIAL]: "Credential",
  [OFFBOARDING_TASK_TYPE.REQUEST]: "Open Request",
  [OFFBOARDING_TASK_TYPE.CHECKLIST]: "Checklist Item",
};

export const TASK_TYPE_NAMES: Record<OffboardingTaskType, string> = {
  [OFFBOARDING_TASK_TYPE.ASSET]: "asset",
  [OFFBOARDING_TASK_TYPE.SOFTWARE]: "software",
  [OFFBOARDING_TASK_TYPE.CREDENTIAL]: "credential",
  [OFFBOARDING_TASK_TYPE.REQUEST]: "request",
  [OFFBOARDING_TASK_TYPE.CHECKLIST]: "checklist",
};

export const TASK_STATUS_LABELS: Record<OffboardingTaskStatus, string> = {
  [OFFBOARDING_TASK_STATUS.PENDING]: "Pending",
  [OFFBOARDING_TASK_STATUS.IN_PROGRESS]: "In Progress",
  [OFFBOARDING_TASK_STATUS.COMPLETED]: "Completed",
  [OFFBOARDING_TASK_STATUS.WAIVED]: "Waived",
  [OFFBOARDING_TASK_STATUS.EXCEPTION]: "Exception",
  [OFFBOARDING_TASK_STATUS.CANCELLED]: "Cancelled",
};

export const TASK_STATUS_NAMES: Record<OffboardingTaskStatus, string> = {
  [OFFBOARDING_TASK_STATUS.PENDING]: "pending",
  [OFFBOARDING_TASK_STATUS.IN_PROGRESS]: "in_progress",
  [OFFBOARDING_TASK_STATUS.COMPLETED]: "completed",
  [OFFBOARDING_TASK_STATUS.WAIVED]: "waived",
  [OFFBOARDING_TASK_STATUS.EXCEPTION]: "exception",
  [OFFBOARDING_TASK_STATUS.CANCELLED]: "cancelled",
};

export const TASK_STATUS_TONES: Record<
  OffboardingTaskStatus,
  "secondary" | "info" | "success" | "warning" | "destructive"
> = {
  [OFFBOARDING_TASK_STATUS.PENDING]: "secondary",
  [OFFBOARDING_TASK_STATUS.IN_PROGRESS]: "info",
  [OFFBOARDING_TASK_STATUS.COMPLETED]: "success",
  [OFFBOARDING_TASK_STATUS.WAIVED]: "warning",
  [OFFBOARDING_TASK_STATUS.EXCEPTION]: "destructive",
  [OFFBOARDING_TASK_STATUS.CANCELLED]: "secondary",
};

export const OFFBOARDING_TASK_STATUS_LABELS = TASK_STATUS_LABELS;
export const OFFBOARDING_TASK_STATUS_TONES = TASK_STATUS_TONES;
export const OFFBOARDING_CASE_STATUS_LABELS = CASE_STATUS_LABELS;
export const OFFBOARDING_CASE_STATUS_TONES = CASE_STATUS_TONES;
export const OFFBOARDING_TASK_TYPE_LABELS = TASK_TYPE_LABELS;

export const EXIT_TYPE_LABELS: Record<OffboardingExitType, string> = {
  [OFFBOARDING_EXIT_TYPE.RESIGNATION]: "Resignation",
  [OFFBOARDING_EXIT_TYPE.TERMINATION]: "Termination",
  [OFFBOARDING_EXIT_TYPE.RETIREMENT]: "Retirement",
  [OFFBOARDING_EXIT_TYPE.CONTRACT_END]: "Contract End",
  [OFFBOARDING_EXIT_TYPE.OTHER]: "Other",
};

export const EXIT_TYPE_NAMES: Record<OffboardingExitType, string> = {
  [OFFBOARDING_EXIT_TYPE.RESIGNATION]: "resignation",
  [OFFBOARDING_EXIT_TYPE.TERMINATION]: "termination",
  [OFFBOARDING_EXIT_TYPE.RETIREMENT]: "retirement",
  [OFFBOARDING_EXIT_TYPE.CONTRACT_END]: "contract_end",
  [OFFBOARDING_EXIT_TYPE.OTHER]: "other",
};

// Transition Rules

export const CASE_TRANSITIONS: Record<
  OffboardingCaseStatus,
  OffboardingCaseStatus[]
> = {
  [OFFBOARDING_CASE_STATUS.OPEN]: [
    OFFBOARDING_CASE_STATUS.IN_PROGRESS,
    OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE,
    OFFBOARDING_CASE_STATUS.CANCELLED,
  ],
  [OFFBOARDING_CASE_STATUS.IN_PROGRESS]: [
    OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE,
    OFFBOARDING_CASE_STATUS.CANCELLED,
  ],
  [OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE]: [
    OFFBOARDING_CASE_STATUS.COMPLETED,
    OFFBOARDING_CASE_STATUS.CANCELLED,
  ],
  [OFFBOARDING_CASE_STATUS.COMPLETED]: [],
  [OFFBOARDING_CASE_STATUS.CANCELLED]: [],
};

export const TASK_TRANSITIONS: Record<
  OffboardingTaskStatus,
  OffboardingTaskStatus[]
> = {
  [OFFBOARDING_TASK_STATUS.PENDING]: [
    OFFBOARDING_TASK_STATUS.IN_PROGRESS,
    OFFBOARDING_TASK_STATUS.COMPLETED,
    OFFBOARDING_TASK_STATUS.WAIVED,
    OFFBOARDING_TASK_STATUS.EXCEPTION,
    OFFBOARDING_TASK_STATUS.CANCELLED,
  ],
  [OFFBOARDING_TASK_STATUS.IN_PROGRESS]: [
    OFFBOARDING_TASK_STATUS.COMPLETED,
    OFFBOARDING_TASK_STATUS.WAIVED,
    OFFBOARDING_TASK_STATUS.EXCEPTION,
    OFFBOARDING_TASK_STATUS.CANCELLED,
  ],
  [OFFBOARDING_TASK_STATUS.COMPLETED]: [],
  [OFFBOARDING_TASK_STATUS.WAIVED]: [],
  [OFFBOARDING_TASK_STATUS.EXCEPTION]: [OFFBOARDING_TASK_STATUS.COMPLETED],
  [OFFBOARDING_TASK_STATUS.CANCELLED]: [],
};

// Offboarding DTOs

export interface OffboardingTaskDto {
  id: number;
  case_id: number;
  task_type: OffboardingTaskType;
  ref_id?: number | null;
  ref_label?: string | null;
  title: string;
  assigned_to?: number | null;
  task_status: OffboardingTaskStatus;
  is_mandatory: boolean;
  due_date: string;
  completed_at?: string | null;
  completed_by?: number | null;
  return_condition?: OffboardingReturnCondition | null;
  to_status?: OffboardingToStatus | null;
  outcome_notes?: string | null;
  waived_by?: number | null;
  waive_reason?: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: number;
    first_name: string;
    last_name?: string;
    email?: string;
  };
  completer?: {
    id: number;
    first_name: string;
    last_name?: string;
    email?: string;
  };
  waiver?: {
    id: number;
    first_name: string;
    last_name?: string;
    email?: string;
  };
}

export interface OffboardingCaseDto {
  id: number;
  case_no: string;
  employee_id: number;
  exit_type: OffboardingExitType;
  resignation_date: string;
  last_working_date: string;
  reason: string;
  initiated_by: number;
  handover_to?: number | null;
  manager_id?: number | null;
  case_status: OffboardingCaseStatus;
  completed_at?: string | null;
  clearance_number?: string | null;
  clearance_issued_at?: string | null;
  clearance_file_path?: string | null;
  handover_receipt_file_path?: string | null;
  notes?: string | null;
  status: number;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    email: string;
    employment_status: EmploymentStatus;
    department?: { id: number; name: string };
    designation?: { id: number; name: string };
    location?: { id: number; name: string };
    manager?: { id: number; first_name: string; last_name?: string };
  };
  initiator?: {
    id: number;
    first_name: string;
    last_name?: string;
    email?: string;
  };
  handover_user?: {
    id: number;
    first_name: string;
    last_name?: string;
    email?: string;
  };
  manager?: {
    id: number;
    first_name: string;
    last_name?: string;
    email?: string;
  };
  tasks?: OffboardingTaskDto[];
  progress?: {
    total: number;
    completed: number;
    pending: number;
    waived: number;
    exceptions: number;
    percent: number;
  };
}

export interface OffboardingChecklistTemplateDto {
  id: number;
  title: string;
  description?: string | null;
  default_assignee_role?: string | null;
  is_mandatory: boolean;
  sort_order: number;
  is_active: boolean;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface OffboardingPreviewDto {
  employee: {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    email: string;
    employment_status: EmploymentStatus;
    department?: string;
    designation?: string;
    manager?: string;
  };
  proposed_handover_to?: {
    id: number;
    first_name: string;
    last_name?: string;
    email?: string;
  } | null;
  handover_strategy: string;
  counts: {
    assets: number;
    software: number;
    credentials: number;
    open_requests: number;
    checklist_templates: number;
    total_tasks: number;
  };
  items: {
    assets: Array<{
      id: number;
      asset_tag: string;
      name?: string;
      serial_number?: string;
      category?: string;
    }>;
    software: Array<{
      id: number;
      software_name: string;
      license_type?: string;
    }>;
    credentials: Array<{
      id: number;
      account_identifier: string;
      credential_type?: string;
    }>;
    requests: Array<{
      id: number;
      request_no: string;
      title: string;
      request_type: number;
    }>;
    checklist: Array<{ id: number; title: string; is_mandatory: boolean }>;
  };
}

export interface OffboardingStatsDto {
  total_cases: number;
  in_notice: number;
  pending_handover: number;
  overdue_returns: number;
  pending_clearance: number;
  completed_cases: number;
  exits_next_30_days: number;
}

export interface PortalOffboardingDto {
  has_case: boolean;
  case?: {
    id: number;
    case_no: string;
    case_status: OffboardingCaseStatus;
    last_working_date: string;
    days_left: number;
    is_overdue: boolean;
    handover_contact?: {
      first_name: string;
      last_name?: string;
      email?: string;
    } | null;
    instructions: string[];
    tasks: Array<{
      id: number;
      task_type: OffboardingTaskType;
      title: string;
      ref_label?: string | null;
      task_status: OffboardingTaskStatus;
      is_mandatory: boolean;
      due_date: string;
    }>;
    progress: {
      total: number;
      completed: number;
      percent: number;
    };
  } | null;
}

// ============================================================================
// Phase R: Real-Time System Contracts & Enums
// ============================================================================

export const REALTIME_EVENTS = {
  // Notifications
  NOTIFICATION_CREATED: "notification.created",
  NOTIFICATION_READ: "notification.read_updated",
  NOTIFICATION_READ_ALL: "notification.read_all",

  // Requests
  REQUEST_CREATED: "request.created",
  REQUEST_UPDATED: "request.updated",
  REQUEST_STATUS_CHANGED: "request.status_changed",
  REQUEST_ASSIGNED: "request.assigned",
  REQUEST_FULFILLED: "request.fulfilled",
  REQUEST_COMMENT_ADDED: "request.comment_added",

  // Credentials
  CREDENTIAL_SUBMITTED: "credential:submitted",
  CREDENTIAL_APPROVAL_CHANGED: "credential:approval_changed",
  CREDENTIAL_REVEALED: "credential:revealed",
  CREDENTIAL_REJECTED: "credential:rejected",
  CREDENTIAL_NEEDS_CHANGE: "credential:needs_change",
  CREDENTIAL_COLLECTION_REQUESTED: "credential:collection_requested",

  // Assets & Software
  ASSET_ASSIGNED: "asset:assigned",
  ASSET_RETURNED: "asset:returned",
  ASSET_STATUS_CHANGED: "asset:status_changed",
  SOFTWARE_ASSIGNED: "software:assigned",
  SOFTWARE_REVOKED: "software:revoked",

  // Offboarding
  OFFBOARDING_INITIATED: "offboarding:initiated",
  OFFBOARDING_CASE_UPDATED: "offboarding:case_updated",
  OFFBOARDING_TASK_UPDATED: "offboarding:task_updated",
  EMPLOYEE_STATUS_CHANGED: "employee:status_changed",

  // System, Stats & Security
  PERMISSIONS_CHANGED: "permissions:changed",
  SESSION_REVOKED: "session:revoked",
  ACCOUNT_LOCKED: "account:locked",
  STATS_UPDATED: "stats:updated",
  SYSTEM_BROADCAST: "system:broadcast",

  // Presence & Typing (Ephemerals)
  PRESENCE_UPDATED: "presence:updated",
  TYPING_UPDATED: "typing:updated",
} as const;

export type RealtimeEventName =
  (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

export const REALTIME_ROOMS = {
  user: (userId: number | string) => `user:${userId}`,
  role: (roleName: string) => `role:${roleName}`,
  request: (requestId: number | string) => `request:${requestId}`,
  requestStaff: (requestId: number | string) => `request:${requestId}:staff`,
  offboarding: (caseId: number | string) => `offboarding:${caseId}`,
  queueRequests: () => "queue:requests",
  queueApprovals: () => "queue:approvals",
  queueHandover: () => "queue:handover",
  queueDashboard: () => "queue:dashboard",
} as const;

export const REALTIME_ROLE_ROOMS = {
  SUPER_ADMIN: `role:${ROLES.SUPER_ADMIN}`,
  HARDWARE_MANAGER: `role:${ROLES.HARDWARE_MANAGER}`,
  HR: `role:${ROLES.HR}`,
  EMPLOYEE: `role:${ROLES.EMPLOYEE}`,
} as const;

export const NOTIFICATION_CATEGORIES = {
  REQUEST: "request",
  CREDENTIAL: "credential",
  ASSET: "asset",
  SOFTWARE: "software",
  OFFBOARDING: "offboarding",
  SYSTEM: "system",
} as const;

export type NotificationCategory =
  (typeof NOTIFICATION_CATEGORIES)[keyof typeof NOTIFICATION_CATEGORIES];

export const NOTIFICATION_PRIORITY = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  URGENT: 4,
} as const;

export type NotificationPriority =
  (typeof NOTIFICATION_PRIORITY)[keyof typeof NOTIFICATION_PRIORITY];

export interface RealtimeEnvelope<T = unknown> {
  id: string;
  event: RealtimeEventName | string;
  version: number;
  ts: number;
  actor?: {
    id: number;
    name: string;
    role?: string;
  } | null;
  data: T;
}

export interface NotificationPayload {
  id: number;
  category: NotificationCategory;
  entity_type?: string | null;
  entity_id?: number | null;
  title: string;
  body: string;
  link?: string | null;
  priority: NotificationPriority;
  read_at?: string | null;
  createdAt: string;
}

export interface NotificationPreferencesDto {
  category: NotificationCategory;
  in_app: boolean;
  email: boolean;
  desktop: boolean;
  sound: boolean;
}

export interface RequestEventPayload {
  id: number;
  request_no: string;
  title: string;
  priority: number;
  request_type: number;
  request_status: number;
  employee_id: number;
  employee_name?: string;
  assigned_to?: number | null;
  assigned_to_name?: string | null;
  reason?: string | null;
  updatedAt?: string;
}

export interface RequestCommentPayload {
  id: number;
  request_id: number;
  comment: string;
  user_id: number;
  author_name: string;
  author_avatar?: string | null;
  is_internal: boolean;
  createdAt: string;
}

export interface CredentialEventPayload {
  id: number;
  label: string;
  credential_type_id: number;
  employee_id: number;
  approval_status: number;
  status: number;
  updatedAt?: string;
}

export interface AssetSoftwareEventPayload {
  id: number;
  type: "asset" | "software" | "license";
  employee_id?: number | null;
  status?: number;
  action: "assigned" | "returned" | "revoked" | "status_changed";
  label: string;
  updatedAt?: string;
}

export interface OffboardingEventPayload {
  case_id: number;
  case_no?: string;
  employee_id: number;
  task_id?: number;
  task_status?: number;
  case_status?: number;
  last_working_date?: string;
  action: "initiated" | "case_updated" | "task_updated" | "status_changed";
}

export interface PresenceUser {
  userId: number;
  name: string;
  avatar?: string | null;
  role?: string;
  joinedAt: number;
}

export interface PresencePayload {
  room: string;
  viewers: PresenceUser[];
}

export interface TypingPayload {
  room: string;
  userId: number;
  name: string;
  isTyping: boolean;
}

export interface StatsUpdatePayload {
  scope: "dashboard" | "requests" | "approvals" | "offboarding";
  stats: Record<string, number>;
}

// Client to Server socket events
export interface ClientToServerEvents {
  "room:join": (
    room: string,
    callback?: (res: { ok: boolean; error?: string }) => void,
  ) => void;
  "room:leave": (
    room: string,
    callback?: (res: { ok: boolean; error?: string }) => void,
  ) => void;
  "typing:start": (room: string) => void;
  "typing:stop": (room: string) => void;
  "presence:heartbeat": (room: string) => void;
}

// Server to Client socket events
export interface ServerToClientEvents {
  [event: string]: (envelope: RealtimeEnvelope<any>) => void;
}
