import { apiClient, compactParams, unwrap } from '../../../lib/api/client';
import type { PaginatedResponse } from '../../../types/api';
import type { CaptureMode, CaptureTask, TaskStatus } from '../../../types/entities';

export interface CaptureTaskListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: TaskStatus;
  mode?: CaptureMode;
}

export interface CaptureTaskDetail extends CaptureTask {
  producedPosts: number;
}

export interface CreateCaptureTaskBody {
  mode: CaptureMode;
  input?: string;
  topicId?: string;
  items?: Array<{ text: string; comments?: string[] }>;
}

export const captureApi = {
  list(params: CaptureTaskListParams): Promise<PaginatedResponse<CaptureTask>> {
    return unwrap(apiClient.get('/capture/tasks', { params: compactParams({ ...params }) }));
  },
  detail(id: string): Promise<CaptureTaskDetail> {
    return unwrap(apiClient.get(`/capture/tasks/${id}`));
  },
  create(body: CreateCaptureTaskBody): Promise<CaptureTask> {
    return unwrap(apiClient.post('/capture/tasks', body));
  },
  advance(id: string): Promise<CaptureTask> {
    return unwrap(apiClient.post(`/capture/tasks/${id}/advance`));
  },
  cancel(id: string): Promise<CaptureTask> {
    return unwrap(apiClient.post(`/capture/tasks/${id}/cancel`));
  },
};
