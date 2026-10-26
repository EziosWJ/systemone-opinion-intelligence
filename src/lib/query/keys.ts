import type { QueryClient } from '@tanstack/react-query';
const domains = ['dashboard','captureTasks','posts','comments','analysisTasks','analysisResults','reviews','rules','topics','reports'] as const;
export type QueryDomain = (typeof domains)[number];
export const queryKeys = Object.fromEntries(domains.map((domain) => [domain, {
  all: [domain] as const,
  list: (query: unknown) => [domain, 'list', query] as const,
  detail: (id: string) => [domain, 'detail', id] as const,
}])) as unknown as Record<QueryDomain, { all: readonly string[]; list: (query: unknown) => readonly unknown[]; detail: (id: string) => readonly string[] }>;
export function invalidateDomains(queryClient: QueryClient, names: QueryDomain[]) {
  for (const domain of new Set(names)) void queryClient.invalidateQueries({ queryKey: queryKeys[domain].all });
}
