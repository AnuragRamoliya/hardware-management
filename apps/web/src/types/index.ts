import type { ApiResponse, Paginated } from "@hm/shared";

export type { ApiResponse, Paginated };

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
}

export interface Option {
  id: string | number;
  name: string;
}

export type UserRoleName = "admin" | "hardware" | "hr" | "employee";

export interface Role {
  id: string | number;
  name: string;
  type?: string;
  description?: string;
  permissions?: Record<string, PermissionSet>;
}

export interface PermissionSet {
  read_access: boolean;
  write_access: boolean;
  delete_access: boolean;
  approve_access?: boolean;
  reveal_access?: boolean;
}

export interface User {
  id: string | number;
  role_id?: string | number;
  first_name: string;
  last_name?: string;
  email: string;
  role?: Role;
  role_name?: UserRoleName;
  avatar_url?: string;
}

export interface Employee extends User {
  employee_code?: string;
  department?: Option;
  designation?: Option;
  location?: Option;
  status?: "active" | "inactive" | "on_leave";
  joined_at?: string;
}

export interface ListQuery {
  currentPage: number;
  itemsPerPage: number;
  filters: Record<
    string,
    | string
    | number
    | boolean
    | null
    | undefined
    | Array<string | number>
    | { from?: string | number; to?: string | number }
  >;
  sortBy: Array<{ id: string; value: "asc" | "desc" }>;
  general_search?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthPayload {
  token: string;
  access_token?: string;
  refresh_token?: string;
  user?: User;
  user_info?: User;
}
