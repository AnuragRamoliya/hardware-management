import { rolesApi } from "@/api/resourceApi";
import { callApi } from "@/api/callApi";
import { api_methods, endPoints } from "@/api/endpoint";
import type { ApiResult, Role } from "@/types";

export interface RolePermission {
  module_id: string | number;
  read_access: boolean | number | string;
  write_access: boolean | number | string;
  delete_access: boolean | number | string;
  module?: { name: string };
}

export const getRoleListApi = rolesApi.list;
export const getRoleByIdApi = rolesApi.get;
export function getRolePermissionsApi(id: string | number) {
  return callApi<RolePermission[]>({
    url: endPoints.role.permissions(id),
    method: api_methods.GET,
  });
}

export function setRolePermissionsApi(
  id: string | number,
  permissions: Array<{
    module_id: string | number;
    read_access: boolean;
    write_access: boolean;
    delete_access: boolean;
  }>,
) {
  return callApi<unknown, { permissions: typeof permissions }>({
    url: endPoints.role.permissions(id),
    method: api_methods.PUT,
    body: { permissions },
  });
}

export function addRoleApi(payload: {
  name: string;
  type: string;
}): Promise<ApiResult<Role>> {
  return callApi<Role, typeof payload>({
    url: endPoints.role.add,
    method: api_methods.POST,
    body: payload,
  });
}

export function updateRoleApi(payload: {
  id: string | number;
  name: string;
}): Promise<ApiResult<Role>> {
  return callApi<Role, typeof payload>({
    url: endPoints.role.update,
    method: api_methods.PUT,
    body: payload,
  });
}
export const deleteRoleApi = rolesApi.remove;
