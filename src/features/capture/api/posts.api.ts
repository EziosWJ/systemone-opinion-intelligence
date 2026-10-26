import { unwrap, apiClient, compactParams } from '../../../lib/api/client';
import type { PaginatedResponse } from '../../../types/api';
import type { SocialPost } from '../../../types/entities';

export interface PostListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  topicId?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PostWithCount extends SocialPost {
  commentCount: number;
}

export interface PostDetail extends PostWithCount {
  comments: Array<{ id: string; text: string; publishedAt: string }>;
}

export const postsApi = {
  list(params: PostListParams): Promise<PaginatedResponse<PostWithCount>> {
    return unwrap(apiClient.get('/posts', { params: compactParams({ ...params }) }));
  },
  detail(id: string): Promise<PostDetail> {
    return unwrap(apiClient.get(`/posts/${id}`));
  },
};
