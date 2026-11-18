import { callApi } from "@/api/callApi";
import { endPoints, api_methods } from "@/api/endpoint";
import type { ListQuery, Paginated, PermissionSet } from "@/types";

export interface ModulePermissionsResponse {
  role_id: string | number;
  module_id: string | number;
  read_access: boolean | number | string;
  write_access: boolean | number | string;
  delete_access: boolean | number | string;
  module?: { name: string };
}

export function getModuleListApi(query: ListQuery) {
  return callApi<Paginated<{ id: string | number; name: string }>, ListQuery>({
    url: endPoints.module.list,
    method: api_methods.POST,
    body: query,
  });
}
export function getModulePermissionApi() {
  return callApi<ModulePermissionsResponse[]>({
    url: endPoints.module.permissions,
    method: api_methods.GET,
  });
}

export function normalizePermissions(
  data: ModulePermissionsResponse[],
): Record<string, PermissionSet> {
  const isAllowed = (value: boolean | number | string) =>
    value === true || value === 1 || value === "1";
  return Object.fromEntries(
    data.flatMap(({ module, read_access, write_access, delete_access }) =>
      module?.name
        ? [
            [
              module.name,
              {
                read_access: isAllowed(read_access),
                write_access: isAllowed(write_access),
                delete_access: isAllowed(delete_access),
              },
            ],
          ]
        : [],
    ),
  );
}
