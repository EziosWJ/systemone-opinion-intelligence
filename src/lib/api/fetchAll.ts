import type { PaginatedResponse } from '../../types/api';

/**
 * Walks the paginated list API until every matching record is collected.
 * Business modules use this for "export all filtered" so the export is not
 * limited to a single page (or an arbitrary server-side max page size).
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>,
  pageSize = 500,
): Promise<T[]> {
  const first = await fetchPage(1, pageSize);
  const items = [...first.items];
  const total = first.total;
  const maxPages = Math.ceil(total / pageSize) + 1;
  let page = 1;

  while (items.length < total && page < maxPages) {
    page += 1;
    const next = await fetchPage(page, pageSize);
    if (next.items.length === 0) break;
    items.push(...next.items);
  }

  return items.slice(0, total);
}
