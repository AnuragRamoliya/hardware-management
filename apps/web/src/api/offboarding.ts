import { api_methods, endPoints } from "@/api/endpoint";
import { callApi } from "@/api/callApi";
import type { ListQuery } from "@/types";
import type {
  OffboardingCaseStatus,
  OffboardingTaskType,
  OffboardingTaskStatus,
  TaskPriority,
} from "@hm/shared";

export interface OffboardingTaskDto {
  id: number;
  case_id: number;
  task_type: OffboardingTaskType;
  title: string;
  description?: string;
  assignee_id?: number;
  assignee?: { id: number; name: string; email: string };
  status: OffboardingTaskStatus;
  task_status?: OffboardingTaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  completed_at?: string;
  completed_by?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OffboardingCaseDto {
  id: number;
  employee_id: number;
  employee?: {
    id: number;
    employee_code?: string;
    first_name: string;
    last_name?: string;
    email: string;
    department?: { id: number; department_name: string };
    designation?: { id: number; designation_name: string };
  };
  initiated_by: number;
  initiator?: { id: number; name: string; email: string };
  last_working_day: string;
  last_working_date?: string;
  reason?: string;
  notes?: string;
  status: OffboardingCaseStatus;
  case_status?: OffboardingCaseStatus;
  completed_at?: string;
  verification_code?: string;
  verification_hash?: string;
  progress?: {
    total: number;
    completed: number;
    waived: number;
    exceptions: number;
    pending: number;
    percent: number;
  };
  tasks?: OffboardingTaskDto[];
  tasks_count?: number;
  completed_tasks_count?: number;
  created_at: string;
  updated_at: string;
}

export interface OffboardingTemplateDto {
  id: number;
  title: string;
  description?: string;
  default_assignee_role?: string;
  is_mandatory: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OffboardingPreviewDto {
  employee: {
    id: number;
    name: string;
    email: string;
    employee_code?: string;
    department?: string;
    designation?: string;
  };
  assets: Array<{
    id: number;
    asset_name: string;
    asset_tag: string;
    serial_number: string;
    category?: string;
  }>;
  software: Array<{
    id: number;
    software_name: string;
    license_type: string;
    assigned_at: string;
  }>;
  credentials: Array<{
    id: number;
    title: string;
    credential_type: string;
    username: string;
  }>;
  openRequests: Array<{
    id: number;
    ticket_number: string;
    title: string;
    status: string;
  }>;
}

export interface DocumentVerificationResult {
  verified: boolean;
  code: string;
  case_id?: number;
  employee_name?: string;
  employee_code?: string;
  last_working_day?: string;
  completed_at?: string;
  hash?: string;
  message?: string;
}

export const offboardingApi = {
  listCases: (query: ListQuery) =>
    callApi<{
      list: OffboardingCaseDto[];
      pagination: {
        totalItems: number;
        currentPage: number;
        itemsPerPage: number;
        totalPages: number;
      };
    }>({
      url: endPoints.offboarding.cases,
      method: api_methods.POST,
      data: query,
    }),

  getCase: (id: number | string) =>
    callApi<OffboardingCaseDto>({
      url: endPoints.offboarding.caseGet(id),
      method: api_methods.GET,
    }),

  preview: (employeeId: number) =>
    callApi<OffboardingPreviewDto>({
      url: endPoints.offboarding.preview,
      method: api_methods.POST,
      data: { employee_id: employeeId },
    }),

  initiate: (payload: {
    employee_id: number;
    last_working_day: string;
    reason?: string;
    notes?: string;
    template_id?: number;
    handover_user_id?: number;
  }) =>
    callApi<OffboardingCaseDto>({
      url: endPoints.offboarding.initiate,
      method: api_methods.POST,
      data: payload,
    }),

  cancelCase: (id: number | string, reason?: string) =>
    callApi<void>({
      url: endPoints.offboarding.cancel(id),
      method: api_methods.POST,
      data: { reason },
    }),

  listTasks: (query: ListQuery) =>
    callApi<{
      list: OffboardingTaskDto[];
      pagination: {
        totalItems: number;
        currentPage: number;
        itemsPerPage: number;
        totalPages: number;
      };
    }>({
      url: endPoints.offboarding.tasks,
      method: api_methods.POST,
      data: query,
    }),

  completeTask: (
    taskId: number,
    data?: { notes?: string; condition?: string },
  ) =>
    callApi<OffboardingTaskDto>({
      url: endPoints.offboarding.taskComplete(taskId),
      method: api_methods.POST,
      data,
    }),

  waiveTask: (taskId: number, notes?: string) =>
    callApi<OffboardingTaskDto>({
      url: endPoints.offboarding.taskWaive(taskId),
      method: api_methods.POST,
      data: { notes },
    }),

  markExceptionTask: (taskId: number, notes?: string) =>
    callApi<OffboardingTaskDto>({
      url: endPoints.offboarding.taskException(taskId),
      method: api_methods.POST,
      data: { notes },
    }),

  receiveByTag: (payload: {
    asset_tag: string;
    condition?: string;
    notes?: string;
  }) =>
    callApi<{
      task: OffboardingTaskDto;
      asset: {
        id: number;
        asset_name: string;
        asset_tag: string;
        serial_number: string;
      };
      case: { id: number; employee_name: string; remaining_tasks: number };
    }>({
      url: endPoints.offboarding.receiveByTag,
      method: api_methods.POST,
      data: payload,
    }),

  verifyDocument: (code: string) =>
    callApi<DocumentVerificationResult>({
      url: endPoints.offboarding.verifyDocument,
      method: api_methods.POST,
      data: { code },
    }),

  listTemplates: (query: ListQuery) =>
    callApi<{
      list: OffboardingTemplateDto[];
      pagination: {
        totalItems: number;
        currentPage: number;
        itemsPerPage: number;
        totalPages: number;
      };
    }>({
      url: endPoints.offboarding.templates,
      method: api_methods.POST,
      data: query,
    }),

  addTemplate: (data: Partial<OffboardingTemplateDto>) =>
    callApi<OffboardingTemplateDto>({
      url: endPoints.offboarding.templateAdd,
      method: api_methods.POST,
      data,
    }),

  updateTemplate: (data: Partial<OffboardingTemplateDto> & { id: number }) =>
    callApi<OffboardingTemplateDto>({
      url: endPoints.offboarding.templateUpdate,
      method: api_methods.PUT,
      data,
    }),

  deleteTemplate: (id: number) =>
    callApi<void>({
      url: endPoints.offboarding.templateDelete(id),
      method: api_methods.DELETE,
    }),

  getPortalSummary: () =>
    callApi<{
      case: OffboardingCaseDto | null;
      tasks: OffboardingTaskDto[];
      assignedAssets: Array<{ id: number; name: string; tag: string }>;
      pendingCount: number;
    }>({
      url: endPoints.offboarding.portalSummary,
      method: api_methods.GET,
    }),

  getNotificationPreferences: () =>
    callApi<{
      categories: {
        requests: boolean;
        assets: boolean;
        credentials: boolean;
        offboarding: boolean;
        system: boolean;
      };
      channels: {
        toast: boolean;
        sound: boolean;
      };
    }>({
      url: endPoints.notificationPreferences.get,
      method: api_methods.POST,
      data: {},
    }),

  updateNotificationPreferences: (payload: {
    categories?: Partial<{
      requests: boolean;
      assets: boolean;
      credentials: boolean;
      offboarding: boolean;
      system: boolean;
    }>;
    channels?: Partial<{
      toast: boolean;
      sound: boolean;
    }>;
  }) =>
    callApi<{ success: boolean; preferences: unknown }>({
      url: endPoints.notificationPreferences.update,
      method: api_methods.POST,
      data: payload,
    }),
};
