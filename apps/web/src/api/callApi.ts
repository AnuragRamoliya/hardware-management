import axios, { type AxiosRequestConfig, type Method } from "axios";
import type { ApiResult, ApiResponse } from "@/types";
import useAuthStore from "@/zustand/user-store";
import { endPoints } from "@/api/endpoint";

interface ApiOptions<TBody = unknown> {
  url: string;
  body?: TBody;
  data?: TBody;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  method: Method;
  retried?: boolean;
  signal?: AbortSignal;
}

const API_URL = import.meta.env.VITE_HOST_API ?? "";
let refreshInFlight: Promise<string | null> | null = null;

async function refreshSession(): Promise<string | null> {
  const refreshToken =
    useAuthStore.getState().refreshToken ??
    localStorage.getItem("refresh_token");
  if (!refreshToken) return null;
  const response = await axios.post<
    ApiResponse<{
      token?: string;
      access_token?: string;
      refresh_token?: string;
    }>
  >(
    `${API_URL}${endPoints.auth.refresh}`,
    { refresh_token: refreshToken },
    { headers: { "plain-text": "true" }, timeout: 30000 },
  );
  if (response.status < 200 || response.status >= 300) return null;
  const data = response.data?.data;
  if (!data) return null;
  const token = data.token ?? data.access_token;
  if (!token) return null;
  const currentUser = useAuthStore.getState().user;
  if (!currentUser) return null;
  useAuthStore
    .getState()
    .setSession(token, data.refresh_token ?? refreshToken, currentUser);
  return token;
}

export async function callApi<T, TBody = unknown>(
  options: ApiOptions<TBody>,
): Promise<ApiResult<T>> {
  const token = useAuthStore.getState().token ?? localStorage.getItem("token");
  const config: AxiosRequestConfig<TBody> = {
    url: `${API_URL}${options.url}`,
    method: options.method,
    data: options.data ?? options.body,
    params: options.params,
    timeout: 120000,
    signal: options.signal,
    validateStatus: () => true,
    headers: {
      ...options.headers,
      "plain-text": "true",
      ...(token ? { token } : {}),
    },
  };
  try {
    const response = await axios.request<ApiResponse<T>>(config);
    if (response.status === 401 && !options.retried) {
      if (!refreshInFlight) {
        refreshInFlight = refreshSession().finally(() => {
          refreshInFlight = null;
        });
      }
      const newToken = await refreshInFlight.catch(() => null);
      if (newToken) return callApi<T, TBody>({ ...options, retried: true });
      useAuthStore.getState().logout();
    } else if (response.status === 401) {
      useAuthStore.getState().logout();
    }
    const payload = response.data;
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      data:
        payload && typeof payload === "object" && "data" in payload
          ? payload.data
          : null,
      message:
        payload && typeof payload === "object" && "message" in payload
          ? String(payload.message)
          : response.statusText,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError<ApiResponse<T>>(error)) {
      const status = error.response?.status ?? 0;
      if (status === 401) useAuthStore.getState().logout();
      return {
        ok: false,
        status,
        data: error.response?.data?.data ?? null,
        message: error.response?.data?.message ?? error.message,
      };
    }
    return {
      ok: false,
      status: 0,
      data: null,
      message: error instanceof Error ? error.message : "Request failed",
    };
  }
}
