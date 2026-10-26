import { unwrap, apiClient, compactParams } from '../../../lib/api/client';
import type { PaginatedResponse } from '../../../types/api';
import type { SocialComment } from '../../../types/entities';

export interface CommentListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  postId?: string;
  topicId?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CommentListItem extends SocialComment {
  postText: string | null;
  postUrl: string | null;
  postPublishedAt: string | null;
  topicIds: string[];
}

export interface CommentDetail extends CommentListItem {
  post: { id: string; url: string; text: string; publishedAt: string; topicIds: string[] } | null;
}

export const commentsApi = {
  list(params: CommentListParams): Promise<PaginatedResponse<CommentListItem>> {
    return unwrap(apiClient.get('/comments', { params: compactParams({ ...params }) }));
  },
  detail(id: string): Promise<CommentDetail> {
    return unwrap(apiClient.get(`/comments/${id}`));
  },
};
