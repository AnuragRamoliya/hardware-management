import { callApi } from "@/api/callApi";
import { endPoints, api_methods } from "@/api/endpoint";
import type { ApiResult, ListQuery, Paginated } from "@/types";

export interface ResourceRecord {
  id: string | number;
  name?: string;
  email?: string;
  status?: string | number;
}

export interface ResourceService {
  endpoint: (typeof endPoints)[keyof typeof endPoints];
}

export async function listResource<T extends ResourceRecord>(
  endpoint: string,
  query: ListQuery,
): Promise<ApiResult<Paginated<T>>> {
  return callApi<Paginated<T>, ListQuery>({
    url: endpoint,
    method: api_methods.POST,
    body: query,
  });
}

export function getResource<T extends ResourceRecord>(
  endpoint: string,
): Promise<ApiResult<T>> {
  return callApi<T>({ url: endpoint, method: api_methods.GET });
}

export function saveResource<T>(
  endpoint: string,
  payload: T,
  method: "POST" | "PUT" = "POST",
): Promise<ApiResult<unknown>> {
  return callApi<unknown, T>({ url: endpoint, method, body: payload });
}

export function deleteResource(endpoint: string): Promise<ApiResult<unknown>> {
  return callApi<unknown>({ url: endpoint, method: api_methods.DELETE });
}

export async function login(payload: { email: string; password: string }) {
  return callApi<
    {
      token: string;
      access_token?: string;
      refresh_token?: string;
      user: import("@/types").User;
    },
    typeof payload
  >({
    url: endPoints.auth.login,
    method: api_methods.POST,
    body: payload,
  });
}

export async function submitAuthForm(
  url: string,
  payload: Record<string, string>,
) {
  return callApi<unknown, Record<string, string>>({
    url,
    method: api_methods.POST,
    body: payload,
  });
}
