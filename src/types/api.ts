export type SortOrder = 'asc' | 'desc';

export interface ListQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export type ApiErrorKind = 'client' | 'server' | 'network' | 'timeout' | 'canceled' | 'unknown';

export interface EntityReference {
  id: string;
  name: string;
}
