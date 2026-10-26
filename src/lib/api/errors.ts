import axios from 'axios';
import type { ApiErrorBody, ApiErrorKind } from '../../types/api';

const kindMessages: Record<ApiErrorKind, string> = {
  client: '请求未能完成，请检查填写内容后重试。',
  server: '服务暂时不可用，请稍后重试。',
  network: '网络连接失败，请检查网络后重试。',
  timeout: '请求超时，请稍后重试。',
  canceled: '请求已取消。',
  unknown: '发生未知错误，请稍后重试。',
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly details?: Record<string, unknown>;
  readonly original: unknown;

  constructor(
    message: string,
    options: {
      kind: ApiErrorKind;
      status?: number;
      code?: string;
      details?: Record<string, unknown>;
      original: unknown;
    },
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = options.kind;
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.original = options.original;
  }

  get retryable(): boolean {
    return this.kind === 'network' || this.kind === 'timeout' || this.kind === 'server';
  }
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && typeof (value as ApiErrorBody).message === 'string';
}

function classifyStatus(status: number | undefined): ApiErrorKind {
  if (status === undefined) return 'network';
  if (status >= 400 && status < 500) return 'client';
  if (status >= 500) return 'server';
  return 'unknown';
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isCancel(error)) {
    return new ApiError(kindMessages.canceled, { kind: 'canceled', original: error });
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const body = error.response?.data;
    const code = error.code;
    const timedOut = code === 'ECONNABORTED' || code === 'ETIMEDOUT';
    const kind: ApiErrorKind = timedOut ? 'timeout' : classifyStatus(status);
    const message = isErrorBody(body) && body.message.trim() ? body.message : kindMessages[kind];

    return new ApiError(message, {
      kind,
      status,
      code: isErrorBody(body) ? body.code : undefined,
      details: isErrorBody(body) ? body.details : undefined,
      original: error,
    });
  }

  if (error instanceof Error) {
    return new ApiError(error.message || kindMessages.unknown, { kind: 'unknown', original: error });
  }

  return new ApiError(kindMessages.unknown, { kind: 'unknown', original: error });
}

export function getErrorMessage(error: unknown): string {
  return normalizeApiError(error).message;
}

/** Field-level validation errors returned by the API, if any. */
export function getFieldErrors(error: unknown): Record<string, string> | undefined {
  const normalized = normalizeApiError(error);
  const details = normalized.details;
  if (!details) return undefined;

  const result: Record<string, string> = {};
  for (const [field, value] of Object.entries(details)) {
    if (typeof value === 'string') result[field] = value;
    else if (Array.isArray(value) && typeof value[0] === 'string') result[field] = value.join('；');
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/** Queries retry at most once; client errors and cancellations never retry. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const normalized = normalizeApiError(error);
  if (!normalized.retryable) return false;
  return failureCount < 1;
}
