import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { callApi } from "@/api/callApi";
import { api_methods, endPoints } from "@/api/endpoint";
import type { ListQuery, Paginated } from "@/types";

export type MaintenanceRecord = {
  id: number;
  asset_id: number;
  issue: string;
  vendor_id?: number | null;
  cost?: number | string | null;
  sent_at: string;
  returned_at?: string | null;
  resolution?: string | null;
  maintenance_status: number;
};

export const maintenanceKeys = {
  all: ["asset-maintenance"] as const,
  lists: () => [...maintenanceKeys.all, "list"] as const,
  list: (query: ListQuery) => [...maintenanceKeys.lists(), query] as const,
  detail: (id: string | number) =>
    [...maintenanceKeys.all, "detail", String(id)] as const,
};

export function useMaintenanceList(query: ListQuery) {
  return useQuery({
    queryKey: maintenanceKeys.list(query),
    queryFn: async () => {
      const response = await callApi<Paginated<MaintenanceRecord>, ListQuery>({
        url: endPoints.asset.maintenance.list,
        method: api_methods.POST,
        body: query,
      });
      if (!response.ok) {
        throw new Error(
          response.message || "Unable to load maintenance records",
        );
      }
      return response.data ?? { rows: [], count: 0 };
    },
  });
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      asset_id: number;
      issue: string;
      vendor_id?: number;
      cost?: number;
      sent_at?: string;
    }) => {
      const response = await callApi<MaintenanceRecord, typeof payload>({
        url: endPoints.asset.maintenance.add,
        method: api_methods.POST,
        body: payload,
      });
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success("Maintenance service started");
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["assets"] });
      void queryClient.invalidateQueries({
        queryKey: ["asset", String(variables.asset_id)],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: number;
      issue?: string;
      vendor_id?: number;
      cost?: number;
      sent_at?: string;
      resolution?: string;
    }) => {
      const response = await callApi<MaintenanceRecord, typeof payload>({
        url: endPoints.asset.maintenance.update,
        method: api_methods.PUT,
        body: payload,
      });
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Maintenance record updated");
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCompleteMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: number;
      returned_at?: string;
      resolution?: string;
      cost?: number;
    }) => {
      const response = await callApi<MaintenanceRecord, typeof payload>({
        url: endPoints.asset.maintenance.complete,
        method: api_methods.POST,
        body: payload,
      });
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Maintenance marked as completed");
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
