import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { assetsApi, type AssetRecord } from "@/api/assets";
import { callApi } from "@/api/callApi";
import { api_methods, endPoints } from "@/api/endpoint";
import type { ListQuery } from "@/types";

export const assetKeys = {
  all: ["assets"] as const,
  lists: () => [...assetKeys.all, "list"] as const,
  list: (query: ListQuery) => [...assetKeys.lists(), query] as const,
  unassigned: (query: ListQuery) =>
    [...assetKeys.all, "unassigned", query] as const,
  details: () => [...assetKeys.all, "detail"] as const,
  detail: (id: string | number) =>
    [...assetKeys.details(), String(id)] as const,
  history: (id: string | number) =>
    [...assetKeys.detail(id), "history"] as const,
  maintenance: (id: string | number) =>
    [...assetKeys.detail(id), "maintenance"] as const,
  activity: (id: string | number) =>
    [...assetKeys.detail(id), "activity"] as const,
  qr: (id: string | number) => [...assetKeys.detail(id), "qr"] as const,
};

export function useAssetsList(query: ListQuery) {
  return useQuery({
    queryKey: assetKeys.list(query),
    queryFn: async () => {
      const response = await assetsApi.list(query);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load assets");
      }
      return response.data;
    },
  });
}

export function useUnassignedAssetsList(query: ListQuery) {
  return useQuery({
    queryKey: assetKeys.unassigned(query),
    queryFn: async () => {
      const response = await assetsApi.unassigned(query);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load unassigned assets");
      }
      return response.data;
    },
  });
}

export function useAsset(id: string | number, enabled = true) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const response = await assetsApi.get(id);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Asset not found");
      }
      return response.data;
    },
  });
}

export function useAssetHistory(id: string | number, enabled = true) {
  return useQuery({
    queryKey: assetKeys.history(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const response = await assetsApi.history(Number(id));
      if (!response.ok) throw new Error(response.message);
      return response.data ?? [];
    },
  });
}

export function useAssetMaintenance(id: string | number, enabled = true) {
  return useQuery({
    queryKey: assetKeys.maintenance(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const response = await callApi<
        { rows: Record<string, unknown>[]; count: number },
        {
          currentPage: number;
          itemsPerPage: number;
          filters: { asset_id: number };
        }
      >({
        url: endPoints.asset.maintenance.list,
        method: api_methods.POST,
        body: {
          currentPage: 1,
          itemsPerPage: 50,
          filters: { asset_id: Number(id) },
        },
      });
      if (!response.ok) throw new Error(response.message);
      return response.data?.rows ?? [];
    },
  });
}

export function useAssetActivity(id: string | number, enabled = true) {
  return useQuery({
    queryKey: assetKeys.activity(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const response = await callApi<
        { rows: Record<string, unknown>[]; count: number },
        { id: number }
      >({
        url: "asset/activity",
        method: api_methods.POST,
        body: { id: Number(id) },
      });
      if (!response.ok) throw new Error(response.message);
      return response.data?.rows ?? [];
    },
  });
}

export function useAssetQrCode(id: string | number, enabled = true) {
  return useQuery({
    queryKey: assetKeys.qr(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const response = await callApi<{ qr: string; tag: string }>({
        url: endPoints.asset.qr(id),
        method: api_methods.GET,
      });
      if (!response.ok || !response.data)
        throw new Error(response.message || "Unable to generate QR");
      return response.data;
    },
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<AssetRecord>) => {
      const response = await assetsApi.add(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Asset created successfully");
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<AssetRecord> & { id: string | number },
    ) => {
      const response = await assetsApi.update(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success("Asset updated successfully");
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      void queryClient.invalidateQueries({
        queryKey: assetKeys.detail(variables.id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await assetsApi.remove(id);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Asset deleted successfully");
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useAssignAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      asset_id: number;
      employee_id: number;
      due_return_date?: string;
      note?: string;
    }) => {
      const response = await assetsApi.assign(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success("Asset assigned successfully");
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      void queryClient.invalidateQueries({
        queryKey: assetKeys.detail(variables.asset_id),
      });
      void queryClient.invalidateQueries({
        queryKey: ["employee-assets", String(variables.employee_id)],
      });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useReturnAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      asset_id: number;
      return_condition?: string;
      notes?: string;
      to_status?: string;
    }) => {
      const response = await assetsApi.returnAsset(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success("Asset returned successfully");
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      void queryClient.invalidateQueries({
        queryKey: assetKeys.detail(variables.asset_id),
      });
      void queryClient.invalidateQueries({ queryKey: ["employee-assets"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useTransferAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      asset_id: number;
      to_employee_id: number;
      note?: string;
    }) => {
      const response = await assetsApi.transfer(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success("Asset transferred successfully");
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      void queryClient.invalidateQueries({
        queryKey: assetKeys.detail(variables.asset_id),
      });
      void queryClient.invalidateQueries({ queryKey: ["employee-assets"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useBulkAssignAssets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      items,
      allOrNothing = true,
    }: {
      items: Array<{
        asset_id: number;
        employee_id: number;
        due_return_date?: string;
        note?: string;
      }>;
      allOrNothing?: boolean;
    }) => {
      const response = await assetsApi.bulkAssign(items, allOrNothing);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Assets assigned in bulk");
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["employee-assets"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useBulkReturnAssets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      items,
      allOrNothing = true,
    }: {
      items: Array<{
        asset_id: number;
        return_condition?: string;
        notes?: string;
        to_status?: string;
      }>;
      allOrNothing?: boolean;
    }) => {
      const response = await assetsApi.bulkReturn(items, allOrNothing);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Assets returned in bulk");
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["employee-assets"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
