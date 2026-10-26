import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from './api/reports.api';

export const reportKeys = {
  reports: (params: unknown) => ['reports', params] as const,
  report: (id: string) => ['reports', 'detail', id] as const,
};

export function useReportList(topicId?: string) {
  return useQuery({ queryKey: reportKeys.reports(topicId ?? 'all'), queryFn: () => reportsApi.list(topicId) });
}

export function useReportDetail(id: string) {
  return useQuery({ queryKey: reportKeys.report(id), queryFn: () => reportsApi.detail(id), enabled: Boolean(id) });
}

export function useCreateReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { topicId: string }) => reportsApi.create(body.topicId),
    onSuccess: () => client.invalidateQueries({ queryKey: ['reports'] }),
  });
}

export function useUpdateReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; contentMarkdown?: string; title?: string; status?: 'draft' | 'ready' | 'exported' }) =>
      reportsApi.update(id, body),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ['reports'] });
      client.invalidateQueries({ queryKey: reportKeys.report(variables.id) });
    },
  });
}

export function useExportReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const blob = await reportsApi.exportHtml(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${id}.html`;
      link.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['reports'] }),
  });
}
