import { api_methods, endPoints } from "@/api/endpoint";
import {
  deleteResource,
  getResource,
  listResource,
  saveResource,
  type ResourceRecord,
} from "@/api/services";
import type { ListQuery } from "@/types";

type CrudEndpoints = {
  list: string;
  add: string;
  update: string;
  getById: (id: string | number) => string;
  delete: (id: string | number) => string;
};

export function createResourceApi<T extends ResourceRecord>(
  endpoints: CrudEndpoints,
) {
  return {
    list: (query: ListQuery) => listResource<T>(endpoints.list, query),
    get: (id: string | number) => getResource<T>(endpoints.getById(id)),
    add: (payload: Partial<T>) =>
      saveResource(endpoints.add, payload, api_methods.POST),
    update: (payload: Partial<T>) =>
      saveResource(endpoints.update, payload, api_methods.PUT),
    remove: (id: string | number) => deleteResource(endpoints.delete(id)),
  };
}

export const usersApi = createResourceApi(endPoints.user);
export const rolesApi = createResourceApi<import("@/types").Role>(
  endPoints.role,
);
export const employeesApi = createResourceApi(endPoints.employee);
export const departmentsApi = createResourceApi(endPoints.department);
export const designationsApi = createResourceApi(endPoints.designation);
export const locationsApi = createResourceApi(endPoints.location);
export const vendorsApi = createResourceApi(endPoints.vendor);
export const assetCategoriesApi = createResourceApi(endPoints.assetCategory);
