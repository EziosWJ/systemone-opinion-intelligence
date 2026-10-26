import axios, { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import {
  ApiError,
  getErrorMessage,
  getFieldErrors,
  normalizeApiError,
  shouldRetryQuery,
} from '../../../src/lib/api/errors';

function axiosErrorWith(status: number | undefined, data?: unknown, code?: string): AxiosError {
  const error = new AxiosError('request failed', code ?? 'ERR_BAD_REQUEST');
  if (status !== undefined) {
    error.response = {
      status,
      statusText: '',
      headers: {},
      config: {} as never,
      data,
    };
  }
  return error;
}

describe('normalizeApiError', () => {
  it('classifies client errors and preserves backend messages and details', () => {
    const error = normalizeApiError(
      axiosErrorWith(409, {
        message: '该客户仍有关联项目或订单',
        code: 'CUSTOMER_HAS_REFERENCES',
        details: { references: { projects: 2 } },
      }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe('client');
    expect(error.status).toBe(409);
    expect(error.code).toBe('CUSTOMER_HAS_REFERENCES');
    expect(error.message).toBe('该客户仍有关联项目或订单');
    expect(error.retryable).toBe(false);
    expect(error.original).toBeInstanceOf(AxiosError);
  });

  it('classifies server and network errors as retryable', () => {
    expect(normalizeApiError(axiosErrorWith(503, { message: '维护中' })).kind).toBe('server');
    expect(normalizeApiError(axiosErrorWith(503, { message: '维护中' })).retryable).toBe(true);
    expect(normalizeApiError(axiosErrorWith(undefined)).kind).toBe('network');
    expect(normalizeApiError(axiosErrorWith(undefined)).message).toContain('网络');
  });

  it('recognises timeouts and cancellations', () => {
    const timeout = normalizeApiError(axiosErrorWith(undefined, undefined, 'ECONNABORTED'));
    expect(timeout.kind).toBe('timeout');
    expect(timeout.retryable).toBe(true);

    const canceled = normalizeApiError(new axios.CanceledError('cancelled'));
    expect(canceled.kind).toBe('canceled');
    expect(canceled.retryable).toBe(false);
  });

  it('falls back to friendly Chinese messages and keeps unknown errors', () => {
    expect(getErrorMessage(axiosErrorWith(500))).toContain('服务');
    expect(getErrorMessage(new Error('自定义错误'))).toBe('自定义错误');
    expect(getErrorMessage('oops')).toContain('未知');
  });

  it('exposes field errors for form binding', () => {
    const error = axiosErrorWith(400, {
      message: '请检查',
      details: { code: '编码已存在', email: ['邮箱无效', '邮箱重复'] },
    });
    expect(getFieldErrors(error)).toEqual({ code: '编码已存在', email: '邮箱无效；邮箱重复' });
    expect(getFieldErrors(new Error('x'))).toBeUndefined();
  });

  it('retries network/server failures once but never client errors', () => {
    const server = axiosErrorWith(500);
    expect(shouldRetryQuery(0, server)).toBe(true);
    expect(shouldRetryQuery(1, server)).toBe(false);
    expect(shouldRetryQuery(0, axiosErrorWith(400))).toBe(false);
    expect(shouldRetryQuery(0, new axios.CanceledError('x'))).toBe(false);
  });
});
