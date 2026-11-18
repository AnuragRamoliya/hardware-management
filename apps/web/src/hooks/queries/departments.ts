import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { departmentsApi } from "@/api/resourceApi";
import type { ListQuery } from "@/types";

export interface DepartmentRecord {
  id: string | number;
  name: string;
  description?: string | null;
  status?: string | number;
  employees_count?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const departmentKeys = {
  all: ["departments"] as const,
  lists: () => [...departmentKeys.all, "list"] as const,
  list: (query: ListQuery) => [...departmentKeys.lists(), query] as const,
  details: () => [...departmentKeys.all, "detail"] as const,
  detail: (id: string | number) =>
    [...departmentKeys.details(), String(id)] as const,
};

export function useDepartmentsList(query: ListQuery) {
  return useQuery({
    queryKey: departmentKeys.list(query),
    queryFn: async () => {
      const response = await departmentsApi.list(query);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load departments");
      }
      return response.data;
    },
  });
}

export function useDepartment(id: string | number, enabled = true) {
  return useQuery({
    queryKey: departmentKeys.detail(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const response = await departmentsApi.get(id);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load department");
      }
      return response.data as unknown as DepartmentRecord;
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<DepartmentRecord>) => {
      const response = await departmentsApi.add(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data: unknown) => {
      const msg =
        typeof data === "object" && data !== null && "message" in data
          ? String(data.message)
          : "Department created successfully";
      toast.success(msg);
      void queryClient.invalidateQueries({ queryKey: departmentKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<DepartmentRecord> & { id: string | number },
    ) => {
      const response = await departmentsApi.update(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success("Department updated successfully");
      void queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      void queryClient.invalidateQueries({
        queryKey: departmentKeys.detail(variables.id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await departmentsApi.remove(id);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Department deleted successfully");
      void queryClient.invalidateQueries({ queryKey: departmentKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
