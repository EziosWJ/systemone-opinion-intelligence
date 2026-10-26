import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { topicsApi } from './api/topics.api';

export const topicKeys = {
  topics: (params: unknown) => ['topics', 'list', params] as const,
  topic: (id: string) => ['topics', 'detail', id] as const,
  insights: (id: string) => ['topics', 'insights', id] as const,
};

export function useTopicList(params: Parameters<typeof topicsApi.list>[0]) {
  return useQuery({ queryKey: topicKeys.topics(params), queryFn: () => topicsApi.list(params) });
}

export function useTopicDetail(id: string) {
  return useQuery({ queryKey: topicKeys.topic(id), queryFn: () => topicsApi.detail(id), enabled: Boolean(id) });
}

export function useTopicInsights(id: string) {
  return useQuery({ queryKey: topicKeys.insights(id), queryFn: () => topicsApi.insights(id), enabled: Boolean(id) });
}

export function useCreateTopic() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof topicsApi.create>[0]) => topicsApi.create(body),
    onSuccess: () => client.invalidateQueries({ queryKey: ['topics'] }),
  });
}

export function useLinkTopicComments() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, commentIds }: { id: string; commentIds: string[] }) => topicsApi.linkComments(id, commentIds),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ['topics'] });
      client.invalidateQueries({ queryKey: topicKeys.insights(variables.id) });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
