import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  employeesApi,
  importEmployeesApi,
  type EmployeeImportResult,
} from "@/api/employees";
import { callApi } from "@/api/callApi";
import { api_methods } from "@/api/endpoint";
import type { ListQuery, Employee } from "@/types";

export type { EmployeeImportResult };

export interface EmployeeRecord extends Omit<Employee, "status"> {
  department_id?: number | string | null;
  designation_id?: number | string | null;
  location_id?: number | string | null;
  manager_id?: number | string | null;
  employment_status?: number | string;
  status?: number | string;
  create_login?: number | string | boolean;
  login_password?: string;
  phone?: string | null;
  join_date?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const employeeKeys = {
  all: ["employees"] as const,
  lists: () => [...employeeKeys.all, "list"] as const,
  list: (query: ListQuery) => [...employeeKeys.lists(), query] as const,
  details: () => [...employeeKeys.all, "detail"] as const,
  detail: (id: string | number) =>
    [...employeeKeys.details(), String(id)] as const,
  activity: (id: string | number) =>
    [...employeeKeys.detail(id), "activity"] as const,
};

export function useEmployeesList(query: ListQuery) {
  return useQuery({
    queryKey: employeeKeys.list(query),
    queryFn: async () => {
      const response = await employeesApi.list(query);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load employees");
      }
      return response.data;
    },
  });
}

export function useEmployee(id: string | number, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const response = await employeesApi.get(id);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load employee");
      }
      return response.data as unknown as EmployeeRecord;
    },
  });
}

export function useEmployeeActivity(id: string | number, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.activity(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const response = await callApi<
        { rows: Record<string, unknown>[]; count: number },
        { id: number }
      >({
        url: "employee/activity",
        method: api_methods.POST,
        body: { id: Number(id) },
      });
      if (!response.ok) throw new Error(response.message);
      return response.data?.rows ?? [];
    },
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<EmployeeRecord>) => {
      const response = await employeesApi.add(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data: unknown) => {
      const msg =
        typeof data === "object" && data !== null && "message" in data
          ? String(data.message)
          : "Employee created successfully";
      toast.success(msg);
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<EmployeeRecord> & { id: string | number },
    ) => {
      const response = await employeesApi.update(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success("Employee updated successfully");
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      void queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(variables.id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await employeesApi.remove(id);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Employee deleted successfully");
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useImportEmployees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const response = await importEmployeesApi(file);
      if (!response.ok || !response.data) throw new Error(response.message);
      return response.data as EmployeeImportResult;
    },
    onSuccess: (report) => {
      toast.success(`${report.imported} employee records imported`);
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
