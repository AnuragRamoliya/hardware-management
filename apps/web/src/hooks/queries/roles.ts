import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getRoleListApi,
  addRoleApi,
  updateRoleApi,
  getRolePermissionsApi,
  setRolePermissionsApi,
} from "@/api/roles";
import { getModuleListApi } from "@/api/modules";
import type { ListQuery, PermissionSet, Role } from "@/types";

export type RoleRecord = Role & { users_count?: number };

export const roleKeys = {
  all: ["roles"] as const,
  lists: () => [...roleKeys.all, "list"] as const,
  list: (query: ListQuery) => [...roleKeys.lists(), query] as const,
  permissions: (id: string | number) =>
    [...roleKeys.all, "permissions", String(id)] as const,
  modules: ["modules"] as const,
};

export function useRolesList(query: ListQuery) {
  return useQuery({
    queryKey: roleKeys.list(query),
    queryFn: async () => {
      const response = await getRoleListApi(query);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load roles");
      }
      return response.data;
    },
  });
}

export function useRolePermissions(id: string | number, enabled = true) {
  return useQuery({
    queryKey: roleKeys.permissions(id),
    enabled: Boolean(id) && enabled,
    queryFn: async () => {
      const response = await getRolePermissionsApi(id);
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load role permissions");
      }
      return response.data;
    },
  });
}

export function useModulesList() {
  return useQuery({
    queryKey: roleKeys.modules,
    queryFn: async () => {
      const response = await getModuleListApi({
        currentPage: 1,
        itemsPerPage: 100,
        filters: {},
        sortBy: [],
        general_search: "",
      });
      if (!response.ok || !response.data) {
        throw new Error(response.message || "Unable to load modules");
      }
      return response.data.rows;
    },
  });
}

export function useSaveRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      selectedId,
      name,
      roleType,
      modules,
      matrix,
    }: {
      selectedId?: string | number | null;
      name: string;
      roleType?: string;
      modules: Array<{ id: number | string; name: string }>;
      matrix: Record<string, PermissionSet>;
    }) => {
      const response = selectedId
        ? await updateRoleApi({ id: selectedId, name })
        : await addRoleApi({ name, type: roleType || "" });

      if (!response.ok) throw new Error(response.message);

      const roleId = selectedId ?? response.data?.id;
      if (!roleId) {
        throw new Error("The server did not return the saved role ID.");
      }

      const permissionsPayload = modules.map((module) => ({
        module_id: module.id,
        read_access: matrix[module.name]?.read_access ?? false,
        write_access: matrix[module.name]?.write_access ?? false,
        delete_access: matrix[module.name]?.delete_access ?? false,
        approve_access: matrix[module.name]?.approve_access ?? false,
        reveal_access: matrix[module.name]?.reveal_access ?? false,
      }));

      const permissionsResponse = await setRolePermissionsApi(
        roleId,
        permissionsPayload,
      );
      if (!permissionsResponse.ok) throw new Error(permissionsResponse.message);

      return response;
    },
    onSuccess: async (result) => {
      toast.success(result.message || "Role saved successfully");
      await queryClient.invalidateQueries({ queryKey: roleKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
