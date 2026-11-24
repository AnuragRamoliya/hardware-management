/**
 * Generic API Client Adapter Interface
 * Replace or bind this implementation to your backend framework (Axios, Fetch, TanStack Query).
 */
export interface ApiClientConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  message?: string;
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || "/api";
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...(config.headers || {}),
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `HTTP error ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
  ): Promise<T> {
    let query = "";
    if (params) {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v));
      });
      query = `?${sp.toString()}`;
    }
    return this.request<T>(`${endpoint}${query}`, { method: "GET" });
  }

  post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
