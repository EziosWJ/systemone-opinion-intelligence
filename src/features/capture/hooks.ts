import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { captureApi } from './api/capture.api';
import { postsApi } from './api/posts.api';
import { commentsApi } from './api/comments.api';

export const queryKeys = {
  captureTasks: (params: unknown) => ['capture', 'tasks', params] as const,
  captureTask: (id: string) => ['capture', 'tasks', 'detail', id] as const,
  posts: (params: unknown) => ['capture', 'posts', params] as const,
  post: (id: string) => ['capture', 'posts', 'detail', id] as const,
  comments: (params: unknown) => ['capture', 'comments', params] as const,
  comment: (id: string) => ['capture', 'comments', 'detail', id] as const,
};

export function useCaptureTaskList(params: Parameters<typeof captureApi.list>[0]) {
  return useQuery({ queryKey: queryKeys.captureTasks(params), queryFn: () => captureApi.list(params) });
}

export function useCaptureTask(id: string) {
  return useQuery({ queryKey: queryKeys.captureTask(id), queryFn: () => captureApi.detail(id), enabled: Boolean(id) });
}

export function useAdvanceCaptureTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => captureApi.advance(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['capture'] });
      client.invalidateQueries({ queryKey: ['capture', 'posts'] });
      client.invalidateQueries({ queryKey: ['capture', 'comments'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCancelCaptureTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => captureApi.cancel(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['capture'] }),
  });
}

export function useCreateCaptureTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof captureApi.create>[0]) => captureApi.create(body),
    onSuccess: () => client.invalidateQueries({ queryKey: ['capture'] }),
  });
}

export function usePostList(params: Parameters<typeof postsApi.list>[0]) {
  return useQuery({ queryKey: queryKeys.posts(params), queryFn: () => postsApi.list(params) });
}

export function usePostDetail(id: string) {
  return useQuery({ queryKey: queryKeys.post(id), queryFn: () => postsApi.detail(id), enabled: Boolean(id) });
}

export function useCommentList(params: Parameters<typeof commentsApi.list>[0]) {
  return useQuery({ queryKey: queryKeys.comments(params), queryFn: () => commentsApi.list(params) });
}

export function useCommentDetail(id: string) {
  return useQuery({ queryKey: queryKeys.comment(id), queryFn: () => commentsApi.detail(id), enabled: Boolean(id) });
}
