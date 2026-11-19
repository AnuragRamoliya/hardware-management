import { api_methods, endPoints } from "@/api/endpoint";
import { callApi } from "@/api/callApi";
import type { ListQuery } from "@/types";
import type {
  RequestDto,
  PortalRequestDto,
  RequestCommentDto,
  RequestStatusHistoryDto,
  RequestAttachmentDto,
  RequestStatsDto,
} from "@hm/shared";

export type {
  RequestDto,
  PortalRequestDto,
  RequestCommentDto,
  RequestStatusHistoryDto,
  RequestAttachmentDto,
  RequestStatsDto,
};

export interface RequestListResponse {
  list: RequestDto[];
  pagination: {
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
  };
}

export interface PortalRequestListResponse {
  list: PortalRequestDto[];
  pagination: {
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
  };
}

export interface FulfilRequestPayload {
  request_id: number;
  asset_id?: number;
  new_asset_id?: number;
  loaner_asset_id?: number;
  license_id?: number;
  return_condition?: string;
  to_status?: string;
  vendor_id?: number;
  cost?: number;
  notes?: string;
}

export interface ReviewRequestPayload {
  id: number;
  action: "start_review" | "approve" | "reject" | "need_info";
  feedback?: string;
  awaiting_stock?: boolean;
}

export const requestsApi = {
  // Admin Endpoints
  list: (query: ListQuery) =>
    callApi<RequestListResponse, ListQuery>({
      url: endPoints.request.list,
      method: api_methods.POST,
      body: query,
    }),

  get: (id: string | number) =>
    callApi<RequestDto>({
      url: endPoints.request.getById(id),
      method: api_methods.GET,
    }),

  take: (id: string | number) =>
    callApi<RequestDto, { id: number }>({
      url: endPoints.request.take,
      method: api_methods.PUT,
      body: { id: Number(id) },
    }),

  assign: (id: string | number, assigned_to: number) =>
    callApi<RequestDto, { id: number; assigned_to: number }>({
      url: endPoints.request.assign,
      method: api_methods.PUT,
      body: { id: Number(id), assigned_to },
    }),

  bulkAssign: (request_ids: number[], assigned_to: number) =>
    callApi<
      { success: boolean; count: number },
      { request_ids: number[]; assigned_to: number }
    >({
      url: endPoints.request.bulkAssign,
      method: api_methods.POST,
      body: { request_ids, assigned_to },
    }),

  review: (data: ReviewRequestPayload) =>
    callApi<RequestDto, ReviewRequestPayload>({
      url: endPoints.request.review,
      method: api_methods.PUT,
      body: data,
    }),

  fulfil: (data: FulfilRequestPayload) =>
    callApi<RequestDto, FulfilRequestPayload>({
      url: endPoints.request.fulfil,
      method: api_methods.PUT,
      body: data,
    }),

  close: (id: string | number, notes?: string) =>
    callApi<RequestDto, { id: number; notes?: string }>({
      url: endPoints.request.close,
      method: api_methods.PUT,
      body: { id: Number(id), notes },
    }),

  comment: (data: {
    request_id: number;
    comment: string;
    is_internal?: boolean;
  }) =>
    callApi<
      RequestCommentDto,
      { request_id: number; comment: string; is_internal?: boolean }
    >({
      url: endPoints.request.comment,
      method: api_methods.POST,
      body: data,
    }),

  stats: () =>
    callApi<{
      metrics: {
        total_requests: number;
        open_requests: number;
        my_queue: number;
        sla_breached: number;
        awaiting_stock: number;
        avg_turnaround_hours: number;
      };
      by_status: Array<{ request_status: number; count: number }>;
      by_type: Array<{ request_type: number; count: number }>;
    }>({
      url: endPoints.request.stats,
      method: api_methods.GET,
    }),

  options: () =>
    callApi<{
      categories: Array<{ id: number; name: string }>;
      reviewers: Array<{
        id: number;
        first_name: string;
        last_name: string;
        email: string;
      }>;
      software: Array<{ id: number; name: string; category?: string }>;
      types: Array<{ id: number; name: string }>;
      statuses: Array<{ id: number; name: string }>;
      priorities: Array<{ id: number; name: string }>;
    }>({
      url: endPoints.request.options,
      method: api_methods.POST,
    }),

  export: (query: ListQuery) =>
    callApi<RequestDto[], ListQuery>({
      url: endPoints.request.export,
      method: api_methods.POST,
      body: query,
    }),

  // Portal Endpoints
  portalList: (query: ListQuery) =>
    callApi<PortalRequestListResponse, ListQuery>({
      url: endPoints.portalRequest.list,
      method: api_methods.POST,
      body: query,
    }),

  portalGet: (id: string | number) =>
    callApi<PortalRequestDto>({
      url: endPoints.portalRequest.getById(id),
      method: api_methods.GET,
    }),

  portalAdd: (data: {
    request_type: number;
    category_id?: number;
    current_asset_id?: number;
    software_id?: number;
    title: string;
    reason: string;
    priority?: number;
    needed_by_date?: string;
  }) =>
    callApi<PortalRequestDto, Record<string, unknown>>({
      url: endPoints.portalRequest.add,
      method: api_methods.POST,
      body: data,
    }),

  portalUpdate: (data: {
    id: number;
    title?: string;
    reason?: string;
    needed_by_date?: string;
    priority?: number;
  }) =>
    callApi<PortalRequestDto, Record<string, unknown>>({
      url: endPoints.portalRequest.update,
      method: api_methods.PUT,
      body: data,
    }),

  portalCancel: (id: string | number, reason?: string) =>
    callApi<PortalRequestDto, { id: number; reason?: string }>({
      url: endPoints.portalRequest.cancel,
      method: api_methods.PUT,
      body: { id: Number(id), reason },
    }),

  portalComment: (data: { request_id: number; comment: string }) =>
    callApi<RequestCommentDto, { request_id: number; comment: string }>({
      url: endPoints.portalRequest.comment,
      method: api_methods.POST,
      body: data,
    }),

  portalAttachment: (data: {
    request_id: number;
    file_name: string;
    file_path: string;
    mime_type: string;
    size: number;
  }) =>
    callApi<RequestAttachmentDto, Record<string, unknown>>({
      url: endPoints.portalRequest.attachment,
      method: api_methods.POST,
      body: data,
    }),

  portalOptions: () =>
    callApi<{
      my_assets: Array<{
        id: number;
        asset_tag: string;
        brand: string;
        model: string;
        category?: { id: number; name: string };
      }>;
      categories: Array<{ id: number; name: string; description?: string }>;
      software: Array<{
        id: number;
        name: string;
        category?: string;
        license_type?: string;
      }>;
    }>({
      url: endPoints.portalRequest.options,
      method: api_methods.GET,
    }),
};
