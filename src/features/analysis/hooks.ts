import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { analysisApi } from './api/analysis.api';

export const analysisKeys = {
  rules: ['analysis', 'rules'] as const,
  tasks: (params: unknown) => ['analysis', 'tasks', params] as const,
  task: (id: string) => ['analysis', 'tasks', 'detail', id] as const,
  results: (params: unknown) => ['analysis', 'results', params] as const,
  result: (id: string) => ['analysis', 'results', 'detail', id] as const,
  reviews: (params: unknown) => ['reviews', params] as const,
};

export function useRules() {
  return useQuery({ queryKey: analysisKeys.rules, queryFn: () => analysisApi.rules() });
}

export function useCreateRule() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof analysisApi.createRule>[0]) => analysisApi.createRule(body),
    onSuccess: () => client.invalidateQueries({ queryKey: analysisKeys.rules }),
  });
}

export function useAnalysisTasks(params: Parameters<typeof analysisApi.tasks>[0]) {
  return useQuery({ queryKey: analysisKeys.tasks(params), queryFn: () => analysisApi.tasks(params) });
}

export function useAnalysisTask(id: string) {
  return useQuery({ queryKey: analysisKeys.task(id), queryFn: () => analysisApi.task(id), enabled: Boolean(id) });
}

export function useCreateAnalysisTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof analysisApi.createTask>[0]) => analysisApi.createTask(body),
    onSuccess: () => client.invalidateQueries({ queryKey: ['analysis', 'tasks'] }),
  });
}

export function useAdvanceAnalysisTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => analysisApi.advanceTask(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['analysis'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAnalysisResults(params: Parameters<typeof analysisApi.results>[0]) {
  return useQuery({ queryKey: analysisKeys.results(params), queryFn: () => analysisApi.results(params) });
}

export function useAnalysisResult(id: string) {
  return useQuery({ queryKey: analysisKeys.result(id), queryFn: () => analysisApi.result(id), enabled: Boolean(id) });
}

export function useReviews(params: Parameters<typeof analysisApi.reviews>[0]) {
  return useQuery({ queryKey: analysisKeys.reviews(params), queryFn: () => analysisApi.reviews(params) });
}

export function useSubmitReview() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ resultId, ...body }: { resultId: string; status: 'confirmed' | 'uncertain' | 'rejected'; note?: string }) =>
      analysisApi.submitReview(resultId, body),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['analysis'] });
      client.invalidateQueries({ queryKey: ['reviews'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
