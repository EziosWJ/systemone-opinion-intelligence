import { unwrap, apiClient, compactParams } from '../../../lib/api/client';
import type { PaginatedResponse } from '../../../types/api';
import type { Topic } from '../../../types/entities';

export interface TopicListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TopicWithCounts extends Topic {
  postCount: number;
  commentCount: number;
}

export interface TopicInsights {
  topicId: string;
  totalComments: number;
  analyzedComments: number;
  pendingReviews: number;
  trend: Array<{ day: string; collected: number }>;
  sentimentDistribution: Array<{ sentiment: string; count: number }>;
  tagDistribution: Array<{ tag: string; count: number }>;
  representative: Array<{
    commentId: string;
    text: string;
    publishedAt: string;
    postText: string;
    relevance: number;
    ironyProbability: number;
  }>;
  topicIdList: string[];
}

export const topicsApi = {
  list(params: TopicListParams): Promise<PaginatedResponse<TopicWithCounts>> {
    return unwrap(apiClient.get('/topics', { params: compactParams({ ...params }) }));
  },
  detail(id: string): Promise<TopicWithCounts> {
    return unwrap(apiClient.get(`/topics/${id}`));
  },
  create(body: { title: string; summary?: string; keywords?: string[] }): Promise<Topic> {
    return unwrap(apiClient.post('/topics', body));
  },
  update(id: string, body: { title?: string; summary?: string; keywords?: string[] }): Promise<Topic> {
    return unwrap(apiClient.patch(`/topics/${id}`, body));
  },
  linkComments(id: string, commentIds: string[]): Promise<{ topicId: string; linked: number }> {
    return unwrap(apiClient.post(`/topics/${id}/comments`, { commentIds }));
  },
  insights(id: string): Promise<TopicInsights> {
    return unwrap(apiClient.get(`/topics/${id}/insights`));
  },
};
