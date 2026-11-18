import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { locationsApi } from "@/api/resourceApi";
import type { ListQuery } from "@/types";

export interface LocationRecord {
  id: string | number;
  name: string;
  address?: string | null;
  status?: string | number;
  createdAt?: string;
  updatedAt?: string;
}

export const locationKeys = {
  all: ["locations"] as const,
  lists: () => [...locationKeys.all, "list"] as const,
  list: (query: ListQuery) => [...locationKeys.lists(), query] as const,
  details: () => [...locationKeys.all, "detail"] as const,
  detail: (id: string | number) =>
    [...locationKeys.details(), String(id)] as const,
};

export function useLocationsList(query: ListQuery) {
  return useQuery({
    queryKey: locationKeys.list(query),
    queryFn: async () => {
      const response = await locationsApi.list(query);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load locations");
      }
      return response.data;
    },
  });
}

export function useLocation(id: string | number, enabled = true) {
  return useQuery({
    queryKey: locationKeys.detail(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const response = await locationsApi.get(id);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load location");
      }
      return response.data as unknown as LocationRecord;
    },
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<LocationRecord>) => {
      const response = await locationsApi.add(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data: unknown) => {
      const msg =
        typeof data === "object" && data !== null && "message" in data
          ? String(data.message)
          : "Location created successfully";
      toast.success(msg);
      void queryClient.invalidateQueries({ queryKey: locationKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<LocationRecord> & { id: string | number },
    ) => {
      const response = await locationsApi.update(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success("Location updated successfully");
      void queryClient.invalidateQueries({ queryKey: locationKeys.all });
      void queryClient.invalidateQueries({
        queryKey: locationKeys.detail(variables.id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await locationsApi.remove(id);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Location deleted successfully");
      void queryClient.invalidateQueries({ queryKey: locationKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
