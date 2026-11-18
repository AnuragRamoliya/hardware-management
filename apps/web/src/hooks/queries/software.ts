import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  softwareApi,
  type SoftwareRecord,
  type LicenseRecord,
} from "@/api/software";
import { callApi } from "@/api/callApi";
import { api_methods } from "@/api/endpoint";
import type { ListQuery } from "@/types";

export const softwareKeys = {
  all: ["software"] as const,
  lists: () => [...softwareKeys.all, "list"] as const,
  list: (query: ListQuery) => [...softwareKeys.lists(), query] as const,
  details: () => [...softwareKeys.all, "detail"] as const,
  detail: (id: string | number) =>
    [...softwareKeys.details(), String(id)] as const,
  licenses: (id: string | number, filterQuery?: unknown) =>
    [...softwareKeys.detail(id), "licenses", filterQuery] as const,
  usage: (id: string | number) =>
    [...softwareKeys.detail(id), "usage"] as const,
  activity: (id: string | number) =>
    [...softwareKeys.detail(id), "activity"] as const,
};

export function useSoftwareList(query: ListQuery) {
  return useQuery({
    queryKey: softwareKeys.list(query),
    queryFn: async () => {
      const response = await softwareApi.list(query);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load software");
      }
      return response.data;
    },
  });
}

export function useSoftware(id: string | number, enabled = true) {
  return useQuery({
    queryKey: softwareKeys.detail(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const response = await softwareApi.get(id);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Software not found");
      }
      return response.data;
    },
  });
}

export function useSoftwareLicenses(
  softwareId: string | number,
  filterQuery?: Record<string, unknown>,
  enabled = true,
) {
  return useQuery({
    queryKey: softwareKeys.licenses(softwareId, filterQuery),
    enabled: Boolean(softwareId) && enabled,
    queryFn: async () => {
      const response = await softwareApi.licenses({
        currentPage: 1,
        itemsPerPage: 100,
        sortBy: [],
        filters: { ...(filterQuery ?? {}), software_id: Number(softwareId) },
      });
      if (!response.ok) throw new Error(response.message);
      return response.data?.rows ?? [];
    },
  });
}

export function useSoftwareUsage(softwareId: string | number, enabled = true) {
  return useQuery({
    queryKey: softwareKeys.usage(softwareId),
    enabled: Boolean(softwareId) && enabled,
    queryFn: async () => {
      const response = await softwareApi.usage(Number(softwareId));
      if (!response.ok) throw new Error(response.message);
      return response.data ?? [];
    },
  });
}

export function useSoftwareActivity(
  softwareId: string | number,
  enabled = true,
) {
  return useQuery({
    queryKey: softwareKeys.activity(softwareId),
    enabled: Boolean(softwareId) && enabled,
    queryFn: async () => {
      const response = await callApi<
        { rows: Record<string, unknown>[]; count: number },
        { id: number }
      >({
        url: "software/activity",
        method: api_methods.POST,
        body: { id: Number(softwareId) },
      });
      if (!response.ok) throw new Error(response.message);
      return response.data?.rows ?? [];
    },
  });
}

export function useCreateSoftware() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<SoftwareRecord>) => {
      const response = await softwareApi.add(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Software added successfully");
      void queryClient.invalidateQueries({ queryKey: softwareKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateSoftware() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<SoftwareRecord> & { id: string | number },
    ) => {
      const response = await softwareApi.update(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success("Software updated successfully");
      void queryClient.invalidateQueries({ queryKey: softwareKeys.all });
      void queryClient.invalidateQueries({
        queryKey: softwareKeys.detail(variables.id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteSoftware() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await softwareApi.remove(id);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Software deleted successfully");
      void queryClient.invalidateQueries({ queryKey: softwareKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      software_id: number;
      license_key?: string;
      seats_total: number;
      purchase_date?: string;
      expiry_date?: string;
    }) => {
      const response = await softwareApi.addLicense(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success("License added successfully");
      void queryClient.invalidateQueries({ queryKey: softwareKeys.all });
      void queryClient.invalidateQueries({
        queryKey: softwareKeys.detail(variables.software_id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<LicenseRecord> & {
        id: string | number;
        software_id: string | number;
      },
    ) => {
      const response = await softwareApi.updateLicense(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success("License updated successfully");
      void queryClient.invalidateQueries({ queryKey: softwareKeys.all });
      void queryClient.invalidateQueries({
        queryKey: softwareKeys.detail(variables.software_id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useAssignSoftware() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      software_id: number;
      employee_id: number;
      license_id?: number;
    }) => {
      const response = await softwareApi.assign(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success("Software assigned successfully");
      void queryClient.invalidateQueries({ queryKey: softwareKeys.all });
      void queryClient.invalidateQueries({
        queryKey: softwareKeys.detail(variables.software_id),
      });
      void queryClient.invalidateQueries({
        queryKey: ["employee-software", String(variables.employee_id)],
      });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRevokeSoftware() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: number) => {
      const response = await softwareApi.revoke(assignmentId);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Software access revoked");
      void queryClient.invalidateQueries({ queryKey: softwareKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["employee-software"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
