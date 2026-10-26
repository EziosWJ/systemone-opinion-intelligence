import { unwrap, apiClient } from '../../../lib/api/client';
import type { PaginatedResponse } from '../../../types/api';
import type { ReportStatus, Topic } from '../../../types/entities';

export interface ReportSnapshot {
  topicId: string;
  totalComments: number;
  analyzedComments: number;
  generatedAt: string;
  ruleVersions: string[];
  resultIds: string[];
}

export interface ReportRecord {
  id: string;
  topicId: string;
  title: string;
  status: ReportStatus;
  contentMarkdown: string;
  snapshot: ReportSnapshot;
  generatedAt: string;
  updatedAt: string;
}

export const reportsApi = {
  list(topicId?: string): Promise<PaginatedResponse<ReportRecord>> {
    return unwrap(apiClient.get('/reports', { params: topicId ? { topicId } : {} }));
  },
  create(topicId: string): Promise<ReportRecord> {
    return unwrap(apiClient.post('/reports', { topicId }));
  },
  detail(id: string): Promise<ReportRecord> {
    return unwrap(apiClient.get(`/reports/${id}`));
  },
  update(id: string, body: { contentMarkdown?: string; title?: string; status?: ReportStatus }): Promise<ReportRecord> {
    return unwrap(apiClient.patch(`/reports/${id}`, body));
  },
  async exportHtml(id: string): Promise<Blob> {
    const response = await apiClient.get(`/reports/${id}/export`, { params: { format: 'html' }, responseType: 'blob' });
    return response.data as Blob;
  },
};

export type { Topic };
