import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useListUrlState, type ListUrlConfig } from '../../src/hooks/useListUrlState';

const config: ListUrlConfig = {
  allowedSortFields: ['name', 'createdAt'],
  defaultSort: { field: 'createdAt', order: 'desc' },
  filterKeys: ['status', 'industry', 'startDateFrom'],
  dateFilterKeys: ['startDateFrom'],
  allowedFilterValues: { status: ['active', 'inactive'], industry: ['信息技术'] },
};

function wrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

describe('useListUrlState', () => {
  it('reads valid URL state and normalises illegal defaults', () => {
    const valid = renderHook(() => useListUrlState(config), {
      wrapper: wrapper('/customers?page=2&pageSize=20&keyword=%20%E5%AE%A2%E6%88%B7%20&status=active&industry=bad&sortBy=name&sortOrder=asc'),
    });
    expect(valid.result.current.state.page).toBe(2);
    expect(valid.result.current.state.pageSize).toBe(20);
    expect(valid.result.current.state.keyword).toBe('客户');
    expect(valid.result.current.state.sortBy).toBe('name');
    expect(valid.result.current.state.sortOrder).toBe('asc');
    expect(valid.result.current.state.filters).toEqual({ status: 'active' });

    const invalid = renderHook(() => useListUrlState(config), {
      wrapper: wrapper('/customers?page=-3&pageSize=999&sortBy=hack&sortOrder=sideways&startDateFrom=2026-99-99&status=deleted'),
    });
    expect(invalid.result.current.state).toMatchObject({
      page: 1,
      pageSize: 10,
      keyword: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      filters: {},
    });
  });

  it('keeps query state in the URL through search, filters, sort and pagination', async () => {
    const { result } = renderHook(() => useListUrlState(config), {
      wrapper: wrapper('/customers'),
    });

    act(() => result.current.submitSearch('  星海  '));
    await waitFor(() => expect(result.current.state.keyword).toBe('星海'));
    expect(result.current.keywordDraft).toBe('星海');

    act(() => result.current.setFilter('status', 'active'));
    await waitFor(() => expect(result.current.state.filters.status).toBe('active'));

    act(() => result.current.setSort('name', 'asc'));
    await waitFor(() => {
      expect(result.current.state.sortBy).toBe('name');
      expect(result.current.state.sortOrder).toBe('asc');
    });

    act(() => result.current.setPage(3));
    await waitFor(() => expect(result.current.state.page).toBe(3));

    act(() => result.current.setPageSize(20));
    await waitFor(() => {
      expect(result.current.state.pageSize).toBe(20);
      expect(result.current.state.page).toBe(1);
    });

    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('resets every list parameter', async () => {
    const { result } = renderHook(() => useListUrlState(config), {
      wrapper: wrapper('/customers?page=3&pageSize=20&keyword=abc&status=active&sortBy=name&sortOrder=asc'),
    });
    expect(result.current.state.page).toBe(3);

    act(() => result.current.reset());
    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        page: 1,
        pageSize: 10,
        keyword: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        filters: {},
      });
    });
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('applies sequential updates without losing earlier changes', async () => {
    const { result } = renderHook(() => useListUrlState(config), {
      wrapper: wrapper('/customers'),
    });

    act(() => {
      result.current.setSort('name', 'asc');
      result.current.setPage(2);
    });

    await waitFor(() => {
      expect(result.current.state.sortBy).toBe('name');
      expect(result.current.state.sortOrder).toBe('asc');
      expect(result.current.state.page).toBe(2);
    });
  });

  it('ignores filters that are not configured', async () => {
    const { result } = renderHook(() => useListUrlState(config), {
      wrapper: wrapper('/customers'),
    });
    act(() => result.current.setFilters({ notAllowed: 'x', status: 'inactive' }));
    await waitFor(() => expect(result.current.state.filters.status).toBe('inactive'));
    expect(result.current.state.filters.notAllowed).toBeUndefined();
  });
});
