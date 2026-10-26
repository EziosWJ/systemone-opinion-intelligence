import { describe, expect, it, vi } from 'vitest';
import { fetchAllPages } from '../../../src/lib/api/fetchAll';
import type { PaginatedResponse } from '../../../src/types/api';

function paginated<T>(all: T[], page: number, pageSize: number): PaginatedResponse<T> {
  return {
    items: all.slice((page - 1) * pageSize, page * pageSize),
    total: all.length,
    page,
    pageSize,
  };
}

describe('fetchAllPages', () => {
  it('walks every page until all matching records are collected', async () => {
    const all = Array.from({ length: 23 }, (_, index) => ({ id: index + 1 }));
    const fetchPage = vi.fn(async (page: number, pageSize: number) => paginated(all, page, pageSize));

    const result = await fetchAllPages(fetchPage, 10);

    expect(result).toEqual(all);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1, 10);
    expect(fetchPage).toHaveBeenNthCalledWith(3, 3, 10);
  });

  it('handles empty results and exact page boundaries', async () => {
    const empty = vi.fn(async () => paginated([], 1, 20));
    await expect(fetchAllPages(empty, 20)).resolves.toEqual([]);

    const boundary = Array.from({ length: 20 }, (_, index) => index);
    const fetchPage = vi.fn(async (page: number, pageSize: number) => paginated(boundary, page, pageSize));
    await expect(fetchAllPages(fetchPage, 20)).resolves.toEqual(boundary);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
