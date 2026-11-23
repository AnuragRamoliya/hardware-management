import { api_methods, endPoints } from "@/api/endpoint";
import { callApi } from "@/api/callApi";
import type { ListQuery, Paginated } from "@/types";
import type {
  CredentialDto,
  CredentialTypeDto,
  CredentialCollectionRequestDto,
  CredentialAccessLogDto,
  CredentialHistoryDto,
  ReauthRequest,
  ReauthResponse,
  RevealSecretRequest,
  RevealSecretResponse,
  ConsentStatusResponse,
  AuditVerificationResult,
  UserSessionDto,
  LoginHistoryDto,
} from "@hm/shared";

export type {
  CredentialDto,
  CredentialTypeDto,
  CredentialCollectionRequestDto,
  CredentialAccessLogDto,
  CredentialHistoryDto,
  ReauthRequest,
  ReauthResponse,
  RevealSecretRequest,
  RevealSecretResponse,
  ConsentStatusResponse,
  AuditVerificationResult,
  UserSessionDto,
  LoginHistoryDto,
};

export const credentialsApi = {
  // Types
  listTypes: (query: ListQuery) =>
    callApi<Paginated<CredentialTypeDto>, ListQuery>({
      url: endPoints.credentialType.list,
      method: api_methods.POST,
      body: query,
    }),
  getType: (id: string | number) =>
    callApi<CredentialTypeDto>({
      url: endPoints.credentialType.getById(id),
      method: api_methods.GET,
    }),
  addType: (data: Partial<CredentialTypeDto>) =>
    callApi<CredentialTypeDto, Partial<CredentialTypeDto>>({
      url: endPoints.credentialType.add,
      method: api_methods.POST,
      body: data,
    }),
  updateType: (data: Partial<CredentialTypeDto> & { id: number }) =>
    callApi<CredentialTypeDto, Partial<CredentialTypeDto>>({
      url: endPoints.credentialType.update,
      method: api_methods.PUT,
      body: data,
    }),
  deleteType: (id: string | number) =>
    callApi<{ success: boolean }>({
      url: endPoints.credentialType.delete(id),
      method: api_methods.DELETE,
    }),
  optionsTypes: () =>
    callApi<CredentialTypeDto[]>({
      url: endPoints.credentialType.options,
      method: api_methods.POST,
    }),

  // Admin Credentials
  list: (query: ListQuery) =>
    callApi<Paginated<CredentialDto>, ListQuery>({
      url: endPoints.credential.list,
      method: api_methods.POST,
      body: query,
    }),
  get: (id: string | number) =>
    callApi<CredentialDto>({
      url: endPoints.credential.getById(id),
      method: api_methods.GET,
    }),
  add: (data: Record<string, unknown>) =>
    callApi<CredentialDto, Record<string, unknown>>({
      url: endPoints.credential.add,
      method: api_methods.POST,
      body: data,
    }),
  update: (data: Record<string, unknown> & { id: number }) =>
    callApi<CredentialDto, Record<string, unknown>>({
      url: endPoints.credential.update,
      method: api_methods.PUT,
      body: data,
    }),
  changePassword: (data: { id: number; password: string }) =>
    callApi<{ success: boolean }, { id: number; password: string }>({
      url: endPoints.credential.changePassword,
      method: api_methods.PUT,
      body: data,
    }),
  delete: (id: string | number) =>
    callApi<{ success: boolean }>({
      url: endPoints.credential.delete(id),
      method: api_methods.DELETE,
    }),
  history: (id: string | number) =>
    callApi<CredentialHistoryDto[]>({
      url: endPoints.credential.history(id),
      method: api_methods.GET,
    }),

  // Approvals Queue
  listApprovals: (query: ListQuery) =>
    callApi<Paginated<CredentialDto>, ListQuery>({
      url: endPoints.credential.approvalsList,
      method: api_methods.POST,
      body: query,
    }),
  approve: (id: string | number) =>
    callApi<CredentialDto>({
      url: endPoints.credential.approve(id),
      method: api_methods.POST,
    }),
  reject: (id: string | number, feedback: string) =>
    callApi<CredentialDto, { feedback: string }>({
      url: endPoints.credential.reject(id),
      method: api_methods.POST,
      body: { feedback },
    }),
  needsChange: (id: string | number, feedback: string) =>
    callApi<CredentialDto, { feedback: string }>({
      url: endPoints.credential.needsChange(id),
      method: api_methods.POST,
      body: { feedback },
    }),
  bulkApprove: (ids: number[]) =>
    callApi<{ approvedCount: number }, { ids: number[] }>({
      url: endPoints.credential.bulkApprove,
      method: api_methods.POST,
      body: { ids },
    }),

  // Reveal
  reveal: (id: string | number, payload: RevealSecretRequest) =>
    callApi<RevealSecretResponse, RevealSecretRequest>({
      url: endPoints.credential.reveal(id),
      method: api_methods.POST,
      body: payload,
    }),

  // Collection Requests
  createRequest: (data: Record<string, unknown>) =>
    callApi<CredentialCollectionRequestDto, Record<string, unknown>>({
      url: endPoints.credential.request.create,
      method: api_methods.POST,
      body: data,
    }),
  listRequests: (query: ListQuery) =>
    callApi<Paginated<CredentialCollectionRequestDto>, ListQuery>({
      url: endPoints.credential.request.list,
      method: api_methods.POST,
      body: query,
    }),
  cancelRequest: (id: string | number) =>
    callApi<{ success: boolean }>({
      url: endPoints.credential.request.cancel(id),
      method: api_methods.POST,
    }),

  // Access Logs & Audit
  listAccessLogs: (query: ListQuery) =>
    callApi<Paginated<CredentialAccessLogDto>, ListQuery>({
      url: endPoints.credential.audit.list,
      method: api_methods.POST,
      body: query,
    }),
  verifyAuditIntegrity: () =>
    callApi<AuditVerificationResult>({
      url: endPoints.credential.audit.verify,
      method: api_methods.POST,
    }),

  // Portal Self-Service
  portalConsentStatus: () =>
    callApi<ConsentStatusResponse>({
      url: endPoints.portalCredential.consentStatus,
      method: api_methods.GET,
    }),
  portalAcceptConsent: () =>
    callApi<{ consent_accepted: boolean; consent_accepted_at: string }>({
      url: endPoints.portalCredential.acceptConsent,
      method: api_methods.POST,
    }),
  portalList: (query: ListQuery) =>
    callApi<Paginated<CredentialDto>, ListQuery>({
      url: endPoints.portalCredential.list,
      method: api_methods.POST,
      body: query,
    }),
  portalGet: (id: string | number) =>
    callApi<CredentialDto>({
      url: endPoints.portalCredential.getById(id),
      method: api_methods.GET,
    }),
  portalAdd: (data: Record<string, unknown>) =>
    callApi<CredentialDto, Record<string, unknown>>({
      url: endPoints.portalCredential.add,
      method: api_methods.POST,
      body: data,
    }),
  portalUpdate: (data: Record<string, unknown> & { id: number }) =>
    callApi<CredentialDto, Record<string, unknown>>({
      url: endPoints.portalCredential.update,
      method: api_methods.PUT,
      body: data,
    }),
  portalChangePassword: (data: { id: number; password: string }) =>
    callApi<{ success: boolean }, { id: number; password: string }>({
      url: endPoints.portalCredential.changePassword,
      method: api_methods.PUT,
      body: data,
    }),
  portalDelete: (id: string | number) =>
    callApi<{ success: boolean }>({
      url: endPoints.portalCredential.delete(id),
      method: api_methods.DELETE,
    }),
  portalReveal: (
    id: string | number,
    payload: { reauth_token: string; reason?: string },
  ) =>
    callApi<RevealSecretResponse, { reauth_token: string; reason?: string }>({
      url: endPoints.portalCredential.reveal(id),
      method: api_methods.POST,
      body: payload,
    }),
  portalRequests: () =>
    callApi<CredentialCollectionRequestDto[]>({
      url: endPoints.portalCredential.requests,
      method: api_methods.GET,
    }),
  portalAllowedTypes: () =>
    callApi<CredentialTypeDto[]>({
      url: endPoints.portalCredential.types,
      method: api_methods.GET,
    }),

  // Security & Sessions
  reauth: (payload: ReauthRequest) =>
    callApi<ReauthResponse, ReauthRequest>({
      url: endPoints.security.reauth,
      method: api_methods.POST,
      body: payload,
    }),
  unlockUser: (userId: string | number) =>
    callApi<{ success: boolean }>({
      url: endPoints.security.unlock(userId),
      method: api_methods.POST,
    }),
  getSessions: () =>
    callApi<UserSessionDto[]>({
      url: endPoints.security.sessions,
      method: api_methods.GET,
    }),
  revokeSession: (sessionId: string | number) =>
    callApi<{ success: boolean }>({
      url: endPoints.security.revokeSession(sessionId),
      method: api_methods.DELETE,
    }),
  revokeOtherSessions: () =>
    callApi<{ success: boolean }>({
      url: endPoints.security.revokeOtherSessions,
      method: api_methods.DELETE,
    }),
  getLoginHistory: (userId?: string | number) =>
    callApi<LoginHistoryDto[]>({
      url: endPoints.security.loginHistory(userId),
      method: api_methods.GET,
    }),
};
