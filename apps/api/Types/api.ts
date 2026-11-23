export interface ApiResult<T> {
  status: number;
  message: string;
  data?: T;
}

export interface UserInfo {
  id: number;
  role_id: number;
  first_name: string;
  last_name: string;
  email: string;
  employee_id?: number;
}

export interface ListDto {
  currentPage?: number;
  itemsPerPage?: number;
  filters?: Record<string, unknown>;
  sortBy?: Array<{ id: string; value: 'asc' | 'desc' | 'ASC' | 'DESC' }>;
  general_search?: string;
  search?: string;
}

export interface AuthTokens {
  token: string;
  refresh_token: string;
  user_info: Omit<UserInfo, 'id' | 'role_id'> & {
    id: number;
    role_id: number;
    role: { id: number; name: string };
  };
}
