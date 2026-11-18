import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  credentialsApi,
  type CredentialTypeDto,
  type RevealSecretRequest,
} from "@/api/credentials";
import type { ListQuery } from "@/types";

export const credentialKeys = {
  all: ["credentials"] as const,
  lists: () => [...credentialKeys.all, "list"] as const,
  list: (query: ListQuery) => [...credentialKeys.lists(), query] as const,
  details: () => [...credentialKeys.all, "detail"] as const,
  detail: (id: string | number) =>
    [...credentialKeys.details(), String(id)] as const,
  history: (id: string | number) =>
    [...credentialKeys.detail(id), "history"] as const,
  approvals: (query: ListQuery) =>
    [...credentialKeys.all, "approvals", query] as const,
  requests: (query: ListQuery) =>
    [...credentialKeys.all, "requests", query] as const,
  accessLogs: (query: ListQuery) =>
    [...credentialKeys.all, "access-logs", query] as const,
  types: (query?: ListQuery) =>
    [...credentialKeys.all, "types", query] as const,
  typeOptions: () => [...credentialKeys.all, "type-options"] as const,
  portal: () => [...credentialKeys.all, "portal"] as const,
  portalList: (query: ListQuery) =>
    [...credentialKeys.portal(), "list", query] as const,
  portalRequests: () => [...credentialKeys.portal(), "requests"] as const,
  portalTypes: () => [...credentialKeys.portal(), "types"] as const,
  consentStatus: () => [...credentialKeys.portal(), "consent-status"] as const,
  sessions: () => ["security", "sessions"] as const,
  loginHistory: (userId?: string | number) =>
    ["security", "login-history", String(userId || "current")] as const,
};

// 1. Credentials CRUD Hooks
export function useCredentialsList(query: ListQuery) {
  return useQuery({
    queryKey: credentialKeys.list(query),
    queryFn: async () => {
      const res = await credentialsApi.list(query);
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load credentials");
      return res.data;
    },
  });
}

export function useCredential(id: string | number, enabled = true) {
  return useQuery({
    queryKey: credentialKeys.detail(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const res = await credentialsApi.get(id);
      if (!res.ok || !res.data)
        throw new Error(res.message || "Credential not found");
      return res.data;
    },
  });
}

export function useCredentialHistory(id: string | number, enabled = true) {
  return useQuery({
    queryKey: credentialKeys.history(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const res = await credentialsApi.history(id);
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load history");
      return res.data;
    },
  });
}

export function useAddCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => credentialsApi.add(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.lists() });
      toast.success("Credential added successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add credential");
    },
  });
}

export function useUpdateCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown> & { id: number }) =>
      credentialsApi.update(data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: credentialKeys.detail(vars.id),
      });
      toast.success("Credential updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update credential");
    },
  });
}

export function useChangeCredentialPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: number; password: string }) =>
      credentialsApi.changePassword(data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: credentialKeys.detail(vars.id),
      });
      toast.success("Password rotated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to change password");
    },
  });
}

export function useDeleteCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => credentialsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.lists() });
      toast.success("Credential revoked and deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete credential");
    },
  });
}

// 2. Approvals Hooks
export function useCredentialApprovalsList(query: ListQuery) {
  return useQuery({
    queryKey: credentialKeys.approvals(query),
    queryFn: async () => {
      const res = await credentialsApi.listApprovals(query);
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load approval queue");
      return res.data;
    },
  });
}

export function useApproveCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => credentialsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.all });
      toast.success("Credential approved");
    },
    onError: (err: Error) => toast.error(err.message || "Approval failed"),
  });
}

export function useRejectCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, feedback }: { id: string | number; feedback: string }) =>
      credentialsApi.reject(id, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.all });
      toast.success("Credential rejected");
    },
    onError: (err: Error) => toast.error(err.message || "Rejection failed"),
  });
}

export function useNeedsChangeCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, feedback }: { id: string | number; feedback: string }) =>
      credentialsApi.needsChange(id, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.all });
      toast.success("Changes requested on credential");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to request changes"),
  });
}

export function useBulkApproveCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => credentialsApi.bulkApprove(ids),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.all });
      toast.success(`${res.data?.approvedCount || 0} credentials approved`);
    },
    onError: (err: Error) => toast.error(err.message || "Bulk approval failed"),
  });
}

// 3. Reveal Secret Hook (Zero cache persistence)
export function useRevealSecret() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: RevealSecretRequest;
    }) => credentialsApi.reveal(id, payload),
    onSuccess: () => {
      // Invalidate access logs so view is immediately recorded in audit table
      queryClient.invalidateQueries({
        queryKey: [...credentialKeys.all, "access-logs"],
      });
    },
  });
}

// 4. Collection Requests Hooks
export function useCredentialRequestsList(query: ListQuery) {
  return useQuery({
    queryKey: credentialKeys.requests(query),
    queryFn: async () => {
      const res = await credentialsApi.listRequests(query);
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load collection requests");
      return res.data;
    },
  });
}

export function useCreateCredentialRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      credentialsApi.createRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...credentialKeys.all, "requests"],
      });
      toast.success("Credential request dispatched to employee");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to create request"),
  });
}

export function useCancelCredentialRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => credentialsApi.cancelRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...credentialKeys.all, "requests"],
      });
      toast.success("Credential request cancelled");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to cancel request"),
  });
}

// 5. Credential Types Hooks
export function useCredentialTypesList(query: ListQuery) {
  return useQuery({
    queryKey: credentialKeys.types(query),
    queryFn: async () => {
      const res = await credentialsApi.listTypes(query);
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load types");
      return res.data;
    },
  });
}

export function useCredentialTypeOptions() {
  return useQuery({
    queryKey: credentialKeys.typeOptions(),
    queryFn: async () => {
      const res = await credentialsApi.optionsTypes();
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load type options");
      return res.data;
    },
  });
}

export function useAddCredentialType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CredentialTypeDto>) =>
      credentialsApi.addType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.types() });
      queryClient.invalidateQueries({ queryKey: credentialKeys.typeOptions() });
      toast.success("Credential type created");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to create type"),
  });
}

export function useUpdateCredentialType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CredentialTypeDto> & { id: number }) =>
      credentialsApi.updateType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.types() });
      queryClient.invalidateQueries({ queryKey: credentialKeys.typeOptions() });
      toast.success("Credential type updated");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to update type"),
  });
}

export function useDeleteCredentialType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => credentialsApi.deleteType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.types() });
      queryClient.invalidateQueries({ queryKey: credentialKeys.typeOptions() });
      toast.success("Credential type deleted");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to delete type"),
  });
}

// 6. Access Logs and Audit Verification
export function useCredentialAccessLogsList(query: ListQuery) {
  return useQuery({
    queryKey: credentialKeys.accessLogs(query),
    queryFn: async () => {
      const res = await credentialsApi.listAccessLogs(query);
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load audit logs");
      return res.data;
    },
  });
}

export function useVerifyAuditIntegrity() {
  return useMutation({
    mutationFn: () => credentialsApi.verifyAuditIntegrity(),
  });
}

// 7. Portal Hooks
export function usePortalConsentStatus() {
  return useQuery({
    queryKey: credentialKeys.consentStatus(),
    queryFn: async () => {
      const res = await credentialsApi.portalConsentStatus();
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to check consent status");
      return res.data;
    },
  });
}

export function usePortalAcceptConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => credentialsApi.portalAcceptConsent(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: credentialKeys.consentStatus(),
      });
      toast.success("Privacy policy accepted");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to accept consent"),
  });
}

export function usePortalCredentialsList(query: ListQuery) {
  return useQuery({
    queryKey: credentialKeys.portalList(query),
    queryFn: async () => {
      const res = await credentialsApi.portalList(query);
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load my accounts");
      return res.data;
    },
  });
}

export function usePortalAddCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      credentialsApi.portalAdd(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.portal() });
      toast.success("Account submitted successfully");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to submit account"),
  });
}

export function usePortalUpdateCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown> & { id: number }) =>
      credentialsApi.portalUpdate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.portal() });
      toast.success("Account updated");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to update account"),
  });
}

export function usePortalChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: number; password: string }) =>
      credentialsApi.portalChangePassword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.portal() });
      toast.success("Password updated successfully");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to update password"),
  });
}

export function usePortalDeleteCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => credentialsApi.portalDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.portal() });
      toast.success("Account removed");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to remove account"),
  });
}

export function usePortalRevealSecret() {
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: { reauth_token: string; reason?: string };
    }) => credentialsApi.portalReveal(id, payload),
  });
}

export function usePortalRequests() {
  return useQuery({
    queryKey: credentialKeys.portalRequests(),
    queryFn: async () => {
      const res = await credentialsApi.portalRequests();
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load collection requests");
      return res.data;
    },
  });
}

export function usePortalAllowedTypes() {
  return useQuery({
    queryKey: credentialKeys.portalTypes(),
    queryFn: async () => {
      const res = await credentialsApi.portalAllowedTypes();
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load account types");
      return res.data;
    },
  });
}

// 8. Security Sessions & Login History
export function useUserSessions() {
  return useQuery({
    queryKey: credentialKeys.sessions(),
    queryFn: async () => {
      const res = await credentialsApi.getSessions();
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load active sessions");
      return res.data;
    },
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string | number) =>
      credentialsApi.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.sessions() });
      toast.success("Session revoked");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to revoke session"),
  });
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => credentialsApi.revokeOtherSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.sessions() });
      toast.success("All other sessions revoked");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to revoke sessions"),
  });
}

export function useLoginHistory(userId?: string | number) {
  return useQuery({
    queryKey: credentialKeys.loginHistory(userId),
    queryFn: async () => {
      const res = await credentialsApi.getLoginHistory(userId);
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load login history");
      return res.data;
    },
  });
}
