import { useQuery } from '@tanstack/react-query';
import { apiClient, unwrap } from '../../lib/api/client';

export interface DashboardSummary {
  range: string;
  generatedAt: string;
  kpi: {
    totalComments: number;
    totalPosts: number;
    commentsInRange: number;
    analyzedComments: number;
    pendingReviews: number;
    activeCaptureTasks: number;
    totalCaptureTasks: number;
    analysisTasks: number;
  };
  trend: Array<{ day: string; collected: number; analyzed: number }>;
  sentiment: Array<{ sentiment: string; count: number }>;
  topicRanking: Array<{ topicId: string; title: string; commentCount: number; analyzedCount: number }>;
}

export const dashboardKeys = {
  summary: (range: string) => ['dashboard', 'summary', range] as const,
};

export function useDashboardSummary(range: string) {
  return useQuery({
    queryKey: dashboardKeys.summary(range),
    queryFn: () => unwrap(apiClient.get<DashboardSummary>('/dashboard/summary', { params: { range } })),
  });
}
