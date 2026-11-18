import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { assetCategoriesApi } from "@/api/resourceApi";
import type { ListQuery } from "@/types";

export interface AssetCategoryRecord {
  id: string | number;
  name: string;
  description?: string | null;
  status?: string | number;
  assets_count?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const assetCategoryKeys = {
  all: ["asset_categories"] as const,
  lists: () => [...assetCategoryKeys.all, "list"] as const,
  list: (query: ListQuery) => [...assetCategoryKeys.lists(), query] as const,
  details: () => [...assetCategoryKeys.all, "detail"] as const,
  detail: (id: string | number) =>
    [...assetCategoryKeys.details(), String(id)] as const,
};

export function useAssetCategoriesList(query: ListQuery) {
  return useQuery({
    queryKey: assetCategoryKeys.list(query),
    queryFn: async () => {
      const response = await assetCategoriesApi.list(query);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load asset categories");
      }
      return response.data;
    },
  });
}

export function useAssetCategory(id: string | number, enabled = true) {
  return useQuery({
    queryKey: assetCategoryKeys.detail(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const response = await assetCategoriesApi.get(id);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load asset category");
      }
      return response.data as unknown as AssetCategoryRecord;
    },
  });
}

export function useCreateAssetCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<AssetCategoryRecord>) => {
      const response = await assetCategoriesApi.add(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data: unknown) => {
      const msg =
        typeof data === "object" && data !== null && "message" in data
          ? String(data.message)
          : "Asset category created successfully";
      toast.success(msg);
      void queryClient.invalidateQueries({ queryKey: assetCategoryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateAssetCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<AssetCategoryRecord> & { id: string | number },
    ) => {
      const response = await assetCategoriesApi.update(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success("Asset category updated successfully");
      void queryClient.invalidateQueries({ queryKey: assetCategoryKeys.all });
      void queryClient.invalidateQueries({
        queryKey: assetCategoryKeys.detail(variables.id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteAssetCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await assetCategoriesApi.remove(id);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Asset category deleted successfully");
      void queryClient.invalidateQueries({ queryKey: assetCategoryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
