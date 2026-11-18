import { callApi } from "@/api/callApi";
import { api_methods, endPoints } from "@/api/endpoint";
import type { ListQuery, Paginated, User } from "@/types";
import type { ApiResult } from "@/types";

export function getUserListApi(
  data: ListQuery,
): Promise<ApiResult<Paginated<User>>> {
  return callApi<Paginated<User>, ListQuery>({
    url: endPoints.user.list,
    method: api_methods.POST,
    body: data,
  });
}

export function getProfileApi(): Promise<ApiResult<User>> {
  return callApi<User>({
    url: endPoints.user.profile,
    method: api_methods.GET,
  });
}
