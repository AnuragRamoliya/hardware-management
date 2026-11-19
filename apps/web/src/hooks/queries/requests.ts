import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  requestsApi,
  type FulfilRequestPayload,
  type ReviewRequestPayload,
} from "@/api/requests";
import type { ListQuery } from "@/types";

export const requestKeys = {
  all: ["requests"] as const,
  lists: () => [...requestKeys.all, "list"] as const,
  list: (query: ListQuery) => [...requestKeys.lists(), query] as const,
  details: () => [...requestKeys.all, "detail"] as const,
  detail: (id: string | number) =>
    [...requestKeys.details(), String(id)] as const,
  stats: () => [...requestKeys.all, "stats"] as const,
  options: () => [...requestKeys.all, "options"] as const,
  portalAll: ["portal-requests"] as const,
  portalLists: () => [...requestKeys.portalAll, "list"] as const,
  portalList: (query: ListQuery) =>
    [...requestKeys.portalLists(), query] as const,
  portalDetails: () => [...requestKeys.portalAll, "detail"] as const,
  portalDetail: (id: string | number) =>
    [...requestKeys.portalDetails(), String(id)] as const,
  portalOptions: () => [...requestKeys.portalAll, "options"] as const,
};

// Admin Queries
export function useRequests(query: ListQuery) {
  return useQuery({
    queryKey: requestKeys.list(query),
    queryFn: async () => {
      const res = await requestsApi.list(query);
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load requests");
      return res.data;
    },
  });
}

export function useRequestDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: requestKeys.detail(id ?? ""),
    queryFn: async () => {
      const res = await requestsApi.get(id!);
      if (!res.ok || !res.data)
        throw new Error(res.message || "Request not found");
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useRequestStats() {
  return useQuery({
    queryKey: requestKeys.stats(),
    queryFn: async () => {
      const res = await requestsApi.stats();
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load request stats");
      return res.data;
    },
  });
}

export function useRequestOptions() {
  return useQuery({
    queryKey: requestKeys.options(),
    queryFn: async () => {
      const res = await requestsApi.options();
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load request options");
      return res.data;
    },
  });
}

// Portal Queries
export function usePortalRequests(query: ListQuery) {
  return useQuery({
    queryKey: requestKeys.portalList(query),
    queryFn: async () => {
      const res = await requestsApi.portalList(query);
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load portal requests");
      return res.data;
    },
  });
}

export function usePortalRequestDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: requestKeys.portalDetail(id ?? ""),
    queryFn: async () => {
      const res = await requestsApi.portalGet(id!);
      if (!res.ok || !res.data)
        throw new Error(res.message || "Request not found");
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function usePortalRequestOptions() {
  return useQuery({
    queryKey: requestKeys.portalOptions(),
    queryFn: async () => {
      const res = await requestsApi.portalOptions();
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to load portal options");
      return res.data;
    },
  });
}

// Admin Mutations
export function useTakeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => requestsApi.take(id),
    onSuccess: (_, id) => {
      toast.success("Request assigned to you successfully");
      qc.invalidateQueries({ queryKey: requestKeys.all });
      qc.invalidateQueries({ queryKey: requestKeys.detail(id) });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Failed to take request");
    },
  });
}

export function useAssignRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      assigned_to,
    }: {
      id: string | number;
      assigned_to: number;
    }) => requestsApi.assign(id, assigned_to),
    onSuccess: (_, vars) => {
      toast.success("Request assigned successfully");
      qc.invalidateQueries({ queryKey: requestKeys.all });
      qc.invalidateQueries({ queryKey: requestKeys.detail(vars.id) });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Failed to assign request");
    },
  });
}

export function useBulkAssignRequests() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      request_ids,
      assigned_to,
    }: {
      request_ids: number[];
      assigned_to: number;
    }) => {
      const res = await requestsApi.bulkAssign(request_ids, assigned_to);
      if (!res.ok || !res.data)
        throw new Error(res.message || "Failed to bulk assign");
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        `${data.count || "Selected"} requests assigned successfully`,
      );
      qc.invalidateQueries({ queryKey: requestKeys.all });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Failed to bulk assign requests");
    },
  });
}

export function useReviewRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReviewRequestPayload) => requestsApi.review(payload),
    onSuccess: (_, vars) => {
      toast.success("Request review decision recorded");
      qc.invalidateQueries({ queryKey: requestKeys.all });
      qc.invalidateQueries({ queryKey: requestKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: requestKeys.portalAll });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Failed to review request");
    },
  });
}

export function useFulfilRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: FulfilRequestPayload) => requestsApi.fulfil(payload),
    onSuccess: (_, vars) => {
      toast.success("Request fulfilled successfully");
      qc.invalidateQueries({ queryKey: requestKeys.all });
      qc.invalidateQueries({ queryKey: requestKeys.detail(vars.request_id) });
      qc.invalidateQueries({ queryKey: requestKeys.portalAll });
      // Targeted cross-module cache invalidations
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["software"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      qc.invalidateQueries({ queryKey: ["employee-assets"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Failed to fulfil request");
    },
  });
}

export function useCloseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string | number; notes?: string }) =>
      requestsApi.close(id, notes),
    onSuccess: (_, vars) => {
      toast.success("Request closed successfully");
      qc.invalidateQueries({ queryKey: requestKeys.all });
      qc.invalidateQueries({ queryKey: requestKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: requestKeys.portalAll });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Failed to close request");
    },
  });
}

export function useAddRequestComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      request_id: number;
      comment: string;
      is_internal?: boolean;
    }) => requestsApi.comment(data),
    onSuccess: (_, vars) => {
      toast.success("Comment added");
      qc.invalidateQueries({ queryKey: requestKeys.detail(vars.request_id) });
      qc.invalidateQueries({
        queryKey: requestKeys.portalDetail(vars.request_id),
      });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Failed to post comment");
    },
  });
}

// Portal Mutations
export function useCreatePortalRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof requestsApi.portalAdd>[0]) =>
      requestsApi.portalAdd(data),
    onSuccess: () => {
      toast.success("Request submitted successfully");
      qc.invalidateQueries({ queryKey: requestKeys.portalAll });
      qc.invalidateQueries({ queryKey: requestKeys.all });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Failed to submit request");
    },
  });
}

export function useUpdatePortalRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof requestsApi.portalUpdate>[0]) =>
      requestsApi.portalUpdate(data),
    onSuccess: (_, vars) => {
      toast.success("Request updated");
      qc.invalidateQueries({ queryKey: requestKeys.portalAll });
      qc.invalidateQueries({ queryKey: requestKeys.portalDetail(vars.id) });
      qc.invalidateQueries({ queryKey: requestKeys.all });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Failed to update request");
    },
  });
}

export function useCancelPortalRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string | number; reason?: string }) =>
      requestsApi.portalCancel(id, reason),
    onSuccess: (_, vars) => {
      toast.success("Request cancelled");
      qc.invalidateQueries({ queryKey: requestKeys.portalAll });
      qc.invalidateQueries({ queryKey: requestKeys.portalDetail(vars.id) });
      qc.invalidateQueries({ queryKey: requestKeys.all });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Failed to cancel request");
    },
  });
}

export function useAddPortalComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { request_id: number; comment: string }) =>
      requestsApi.portalComment(data),
    onSuccess: (_, vars) => {
      toast.success("Reply posted");
      qc.invalidateQueries({
        queryKey: requestKeys.portalDetail(vars.request_id),
      });
      qc.invalidateQueries({ queryKey: requestKeys.detail(vars.request_id) });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Failed to post comment");
    },
  });
}

export function useAddPortalAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof requestsApi.portalAttachment>[0]) =>
      requestsApi.portalAttachment(data),
    onSuccess: (_, vars) => {
      toast.success("Attachment uploaded");
      qc.invalidateQueries({
        queryKey: requestKeys.portalDetail(vars.request_id),
      });
      qc.invalidateQueries({ queryKey: requestKeys.detail(vars.request_id) });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Failed to upload attachment");
    },
  });
}
