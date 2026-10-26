import type { QueryClient } from '@tanstack/react-query';
import type {
  CustomerListQuery,
  DashboardRange,
  OrderListQuery,
  ProjectListQuery,
  UserListQuery,
} from '../../types/entities';

export const queryKeys = {
  customers: {
    all: ['customers'] as const,
    lists: () => ['customers', 'list'] as const,
    list: (query: CustomerListQuery) => ['customers', 'list', query] as const,
    details: () => ['customers', 'detail'] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
    references: (id: string) => ['customers', 'references', id] as const,
  },
  projects: {
    all: ['projects'] as const,
    lists: () => ['projects', 'list'] as const,
    list: (query: ProjectListQuery) => ['projects', 'list', query] as const,
    details: () => ['projects', 'detail'] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
  },
  orders: {
    all: ['orders'] as const,
    lists: () => ['orders', 'list'] as const,
    list: (query: OrderListQuery) => ['orders', 'list', query] as const,
    details: () => ['orders', 'detail'] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  users: {
    all: ['users'] as const,
    lists: () => ['users', 'list'] as const,
    list: (query: UserListQuery) => ['users', 'list', query] as const,
    details: () => ['users', 'detail'] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: (range: DashboardRange) => ['dashboard', 'summary', range] as const,
  },
};

export type QueryDomain = 'customers' | 'projects' | 'orders' | 'users' | 'dashboard';

const domainPrefixes: Record<QueryDomain, readonly unknown[]> = {
  customers: ['customers'],
  projects: ['projects'],
  orders: ['orders'],
  users: ['users'],
  dashboard: ['dashboard'],
};

export function invalidateDomains(queryClient: QueryClient, domains: QueryDomain[]): void {
  for (const domain of new Set(domains)) {
    void queryClient.invalidateQueries({ queryKey: domainPrefixes[domain] });
  }
}
