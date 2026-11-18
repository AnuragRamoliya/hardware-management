import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { designationsApi } from "@/api/resourceApi";
import type { ListQuery } from "@/types";

export interface DesignationRecord {
  id: string | number;
  name: string;
  description?: string | null;
  status?: string | number;
  createdAt?: string;
  updatedAt?: string;
}

export const designationKeys = {
  all: ["designations"] as const,
  lists: () => [...designationKeys.all, "list"] as const,
  list: (query: ListQuery) => [...designationKeys.lists(), query] as const,
  details: () => [...designationKeys.all, "detail"] as const,
  detail: (id: string | number) =>
    [...designationKeys.details(), String(id)] as const,
};

export function useDesignationsList(query: ListQuery) {
  return useQuery({
    queryKey: designationKeys.list(query),
    queryFn: async () => {
      const response = await designationsApi.list(query);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load designations");
      }
      return response.data;
    },
  });
}

export function useDesignation(id: string | number, enabled = true) {
  return useQuery({
    queryKey: designationKeys.detail(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const response = await designationsApi.get(id);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load designation");
      }
      return response.data as unknown as DesignationRecord;
    },
  });
}

export function useCreateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<DesignationRecord>) => {
      const response = await designationsApi.add(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data: unknown) => {
      const msg =
        typeof data === "object" && data !== null && "message" in data
          ? String(data.message)
          : "Designation created successfully";
      toast.success(msg);
      void queryClient.invalidateQueries({ queryKey: designationKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<DesignationRecord> & { id: string | number },
    ) => {
      const response = await designationsApi.update(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success("Designation updated successfully");
      void queryClient.invalidateQueries({ queryKey: designationKeys.all });
      void queryClient.invalidateQueries({
        queryKey: designationKeys.detail(variables.id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await designationsApi.remove(id);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Designation deleted successfully");
      void queryClient.invalidateQueries({ queryKey: designationKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
