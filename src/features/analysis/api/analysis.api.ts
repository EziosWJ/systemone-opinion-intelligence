import { unwrap, apiClient, compactParams } from '../../../lib/api/client';
import type { PaginatedResponse } from '../../../types/api';
import type { AnalysisResult, AnalysisRule, AnalysisTask, ReviewDecision, TaskStatus } from '../../../types/entities';

export interface AnalysisTaskListParams {
  page: number;
  pageSize: number;
  status?: TaskStatus;
  ruleId?: string;
}

export interface AnalysisTaskWithCount extends AnalysisTask {
  resultCount: number;
}

export interface AnalysisResultRow extends AnalysisResult {
  reviewStatus: 'pending' | 'confirmed' | 'uncertain' | 'rejected';
  commentText: string | null;
  postText: string | null;
  postUrl: string | null;
  postId: string | null;
  commentPublishedAt: string | null;
}

export interface AnalysisResultDetail extends AnalysisResultRow {
  reviewHistory: ReviewDecision[];
}

export interface ResultListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  reviewStatus?: string;
  sentiment?: string;
  ruleId?: string;
  tag?: string;
  topicId?: string;
  analysisTaskId?: string;
  minRelevance?: number;
  maxRelevance?: number;
  minIrony?: number;
  maxIrony?: number;
  minPriority?: number;
  maxPriority?: number;
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const analysisApi = {
  rules(): Promise<PaginatedResponse<AnalysisRule>> {
    return unwrap(apiClient.get('/analysis/rules'));
  },
  createRule(body: { name: string; promptTemplate?: string }): Promise<AnalysisRule> {
    return unwrap(apiClient.post('/analysis/rules', body));
  },
  tasks(params: AnalysisTaskListParams): Promise<PaginatedResponse<AnalysisTaskWithCount>> {
    return unwrap(apiClient.get('/analysis/tasks', { params: compactParams({ ...params }) }));
  },
  task(id: string): Promise<AnalysisTaskWithCount> {
    return unwrap(apiClient.get(`/analysis/tasks/${id}`));
  },
  createTask(body: { ruleId: string; ruleVersion?: number; commentIds?: string[]; topicId?: string; limit?: number }): Promise<AnalysisTask> {
    return unwrap(apiClient.post('/analysis/tasks', body));
  },
  advanceTask(id: string): Promise<AnalysisTask> {
    return unwrap(apiClient.post(`/analysis/tasks/${id}/advance`));
  },
  results(params: ResultListParams): Promise<PaginatedResponse<AnalysisResultRow>> {
    return unwrap(apiClient.get('/analysis/results', { params: compactParams({ ...params }) }));
  },
  result(id: string): Promise<AnalysisResultDetail> {
    return unwrap(apiClient.get(`/analysis/results/${id}`));
  },
  reviewHistory(resultId: string): Promise<{ items: ReviewDecision[] }> {
    return unwrap(apiClient.get(`/analysis/results/${resultId}/reviews`));
  },
  submitReview(resultId: string, body: { status: 'confirmed' | 'uncertain' | 'rejected'; note?: string }): Promise<ReviewDecision> {
    return unwrap(apiClient.post(`/analysis/results/${resultId}/reviews`, body));
  },
  reviews(params: { page: number; pageSize: number; status?: string; keyword?: string }): Promise<PaginatedResponse<AnalysisResultRow>> {
    return unwrap(apiClient.get('/reviews', { params: compactParams({ ...params }) }));
  },
};
