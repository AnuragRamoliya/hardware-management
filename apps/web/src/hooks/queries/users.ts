import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usersApi } from "@/api/resourceApi";
import type { ListQuery, User } from "@/types";

export interface UserRecord extends User {
  status?: string | number;
  role?: { id: string | number; name: string };
  createdAt?: string;
  updatedAt?: string;
}

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (query: ListQuery) => [...userKeys.lists(), query] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string | number) => [...userKeys.details(), String(id)] as const,
};

export function useUsersList(query: ListQuery) {
  return useQuery({
    queryKey: userKeys.list(query),
    queryFn: async () => {
      const response = await usersApi.list(query);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load users");
      }
      return response.data;
    },
  });
}

export function useUser(id: string | number, enabled = true) {
  return useQuery({
    queryKey: userKeys.detail(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const response = await usersApi.get(id);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load user");
      }
      return response.data as unknown as UserRecord;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<UserRecord> & { password?: string },
    ) => {
      const response = await usersApi.add(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data: unknown) => {
      const msg =
        typeof data === "object" && data !== null && "message" in data
          ? String(data.message)
          : "User created successfully";
      toast.success(msg);
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<UserRecord> & { id: string | number; password?: string },
    ) => {
      const response = await usersApi.update(payload);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success("User updated successfully");
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      void queryClient.invalidateQueries({
        queryKey: userKeys.detail(variables.id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await usersApi.remove(id);
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("User deleted successfully");
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
