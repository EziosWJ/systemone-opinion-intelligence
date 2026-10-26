import axios, { type AxiosResponse } from 'axios';
import { env } from '../../config/env';

/**
 * Every request keeps the full AxiosResponse by default. Feature API modules
 * explicitly unwrap the typed `.data` for their own known contract.
 */
export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

export function unwrap<T>(request: Promise<AxiosResponse<T>>): Promise<T> {
  return request.then((response) => response.data);
}

export function compactParams(params: Record<string, unknown>): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'string' || typeof value === 'number') result[key] = value;
  }
  return result;
}
