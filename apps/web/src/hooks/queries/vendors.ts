import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { vendorsApi } from "@/api/resourceApi";
import type { ListQuery } from "@/types";

export interface VendorRecord {
  id: string | number;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status?: string | number;
  createdAt?: string;
  updatedAt?: string;
}

export const vendorKeys = {
  all: ["vendors"] as const,
  lists: () => [...vendorKeys.all, "list"] as const,
  list: (query: ListQuery) => [...vendorKeys.lists(), query] as const,
  details: () => [...vendorKeys.all, "detail"] as const,
  detail: (id: string | number) =>
    [...vendorKeys.details(), String(id)] as const,
};

export function useVendorsList(query: ListQuery) {
  return useQuery({
    queryKey: vendorKeys.list(query),
    queryFn: async () => {
      const response = await vendorsApi.list(query);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load vendors");
      }
      return response.data;
    },
  });
}

export function useVendor(id: string | number, enabled = true) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const response = await vendorsApi.get(id);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load vendor");
      }
      return response.data as unknown as VendorRecord;
    },
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<VendorRecord>) => {
      const response = await vendorsApi.add(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data: unknown) => {
      const msg =
        typeof data === "object" && data !== null && "message" in data
          ? String(data.message)
          : "Vendor created successfully";
      toast.success(msg);
      void queryClient.invalidateQueries({ queryKey: vendorKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<VendorRecord> & { id: string | number },
    ) => {
      const response = await vendorsApi.update(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success("Vendor updated successfully");
      void queryClient.invalidateQueries({ queryKey: vendorKeys.all });
      void queryClient.invalidateQueries({
        queryKey: vendorKeys.detail(variables.id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await vendorsApi.remove(id);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Vendor deleted successfully");
      void queryClient.invalidateQueries({ queryKey: vendorKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
