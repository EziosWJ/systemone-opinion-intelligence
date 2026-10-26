import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortOrder } from '../types/api';
import { isDateString } from '../utils/format';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../config/options';

export interface ListUrlConfig {
  allowedSortFields: readonly string[];
  defaultSort?: { field: string; order: SortOrder };
  dateFilterKeys?: readonly string[];
  filterKeys?: readonly string[];
  allowedFilterValues?: Record<string, readonly string[]>;
  defaultPageSize?: number;
  allowedPageSizes?: readonly number[];
  maxKeywordLength?: number;
}

export interface ListUrlState {
  page: number;
  pageSize: number;
  keyword: string;
  sortBy?: string;
  sortOrder?: SortOrder;
  filters: Record<string, string>;
}

const EMPTY_KEYS: readonly string[] = [];
const EMPTY_FILTER_VALUES: Record<string, readonly string[]> = {};

function parsePositiveInt(value: string | null, fallback: number): number {
  if (value === null || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function useListUrlState(config: ListUrlConfig) {
  const {
    allowedSortFields,
    dateFilterKeys = EMPTY_KEYS,
    filterKeys = EMPTY_KEYS,
    allowedFilterValues = EMPTY_FILTER_VALUES,
    allowedPageSizes = PAGE_SIZE_OPTIONS,
    defaultPageSize = DEFAULT_PAGE_SIZE,
    maxKeywordLength = 100,
  } = config;

  const [searchParams, setSearchParams] = useSearchParams();
  // Tracks the newest intended URL state so synchronous updates compose instead
  // of overwriting one another with the current render's snapshot.
  const paramsRef = useRef(searchParams);

  useEffect(() => {
    paramsRef.current = searchParams;
  }, [searchParams]);

  const state = useMemo<ListUrlState>(() => {
    const requestedPageSize = parsePositiveInt(searchParams.get('pageSize'), defaultPageSize);
    const pageSize = allowedPageSizes.includes(requestedPageSize) ? requestedPageSize : defaultPageSize;
    const rawKeyword = (searchParams.get('keyword') ?? '').trim().slice(0, maxKeywordLength);
    const requestedSort = searchParams.get('sortBy') ?? '';
    const sortBy = allowedSortFields.includes(requestedSort) ? requestedSort : config.defaultSort?.field;
    const requestedOrder = searchParams.get('sortOrder');
    const sortOrder: SortOrder | undefined = sortBy
      ? requestedOrder === 'asc' || requestedOrder === 'desc'
        ? requestedOrder
        : config.defaultSort?.order
      : undefined;

    const filters: Record<string, string> = {};
    for (const key of filterKeys) {
      const value = (searchParams.get(key) ?? '').trim();
      if (!value) continue;
      if (dateFilterKeys.includes(key) && !isDateString(value)) continue;
      const allowed = allowedFilterValues[key];
      if (allowed && !allowed.includes(value)) continue;
      filters[key] = value;
    }

    return {
      page: parsePositiveInt(searchParams.get('page'), 1),
      pageSize,
      keyword: rawKeyword,
      sortBy,
      sortOrder,
      filters,
    };
  }, [
    searchParams,
    allowedPageSizes,
    defaultPageSize,
    maxKeywordLength,
    allowedSortFields,
    dateFilterKeys,
    filterKeys,
    allowedFilterValues,
    config.defaultSort?.field,
    config.defaultSort?.order,
  ]);

  const [keywordDraft, setKeywordDraft] = useState(state.keyword);

  // Keep the local input in sync when the URL changes (back/forward, reset, deep links).
  useEffect(() => {
    setKeywordDraft(state.keyword);
  }, [state.keyword]);

  const update = useCallback(
    (mutate: (params: URLSearchParams) => void, replace = false) => {
      const next = new URLSearchParams(paramsRef.current);
      mutate(next);
      paramsRef.current = next;
      setSearchParams(next, { replace });
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (page: number, replace = false) => {
      update((next) => {
        if (page <= 1) next.delete('page');
        else next.set('page', String(page));
      }, replace);
    },
    [update],
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      update((next) => {
        if (pageSize === defaultPageSize) next.delete('pageSize');
        else next.set('pageSize', String(pageSize));
        next.delete('page');
      });
    },
    [defaultPageSize, update],
  );

  const submitSearch = useCallback(
    (keyword?: string) => {
      const value = (keyword ?? keywordDraft).trim().slice(0, maxKeywordLength);
      update((next) => {
        if (value) next.set('keyword', value);
        else next.delete('keyword');
        next.delete('page');
      });
    },
    [keywordDraft, maxKeywordLength, update],
  );

  const setFilters = useCallback(
    (values: Record<string, string | undefined>, resetPage = true) => {
      update((next) => {
        for (const [key, value] of Object.entries(values)) {
          if (!filterKeys.includes(key)) continue;
          if (value) next.set(key, value);
          else next.delete(key);
        }
        if (resetPage) next.delete('page');
      });
    },
    [filterKeys, update],
  );

  const setFilter = useCallback(
    (key: string, value: string | undefined) => setFilters({ [key]: value }),
    [setFilters],
  );

  const setSort = useCallback(
    (field: string | undefined, order: SortOrder | undefined) => {
      update((next) => {
        if (!field || !order || !allowedSortFields.includes(field)) {
          next.delete('sortBy');
          next.delete('sortOrder');
        } else {
          next.set('sortBy', field);
          next.set('sortOrder', order);
        }
        next.delete('page');
      });
    },
    [allowedSortFields, update],
  );

  const reset = useCallback(() => {
    const next = new URLSearchParams(paramsRef.current);
    for (const key of ['page', 'pageSize', 'keyword', 'sortBy', 'sortOrder', ...filterKeys]) {
      next.delete(key);
    }
    paramsRef.current = next;
    setSearchParams(next, { replace: false });
    setKeywordDraft('');
  }, [filterKeys, setSearchParams]);

  const hasActiveFilters = Boolean(
    state.keyword ||
      Object.keys(state.filters).length > 0 ||
      (state.sortBy && (state.sortBy !== config.defaultSort?.field || state.sortOrder !== config.defaultSort?.order)),
  );
  const hasActiveQuery = hasActiveFilters || state.page > 1 || state.pageSize !== defaultPageSize;

  const listQuery = useMemo(
    () => ({
      ...state.filters,
      page: state.page,
      pageSize: state.pageSize,
      ...(state.keyword ? { keyword: state.keyword } : {}),
      ...(state.sortBy && state.sortOrder ? { sortBy: state.sortBy, sortOrder: state.sortOrder } : {}),
    }),
    [state],
  );

  return {
    state,
    listQuery,
    keywordDraft,
    setKeywordDraft,
    submitSearch,
    setFilter,
    setFilters,
    setSort,
    setPage,
    setPageSize,
    reset,
    hasActiveFilters,
    hasActiveQuery,
  };
}
