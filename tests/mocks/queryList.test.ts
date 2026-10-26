import { beforeAll, describe, expect, it } from 'vitest';
import { db, queryList } from '../../src/mocks/db/database';
import { buildSeedData } from '../../src/mocks/data/seed';

beforeAll(() => {
  db.reset(buildSeedData());
});

describe('queryList engine', () => {
  const base = {
    idOf: (c: (typeof db.comments)[number]) => c.id,
    textOf: (c: (typeof db.comments)[number]) => [c.text],
    query: { page: 1, pageSize: 10 },
  };

  it('paginates 10k comments deterministically', () => {
    const page1 = queryList({ ...base, items: db.comments });
    const page2 = queryList({ ...base, items: db.comments, query: { page: 2, pageSize: 10 } });
    expect(page1.total).toBe(10_000);
    expect(page1.items).toHaveLength(10);
    expect(new Set([...page1.items, ...page2.items]).size).toBe(20);
    // stable order without sort → same first item twice
    expect(page1.items[0].id).toBe(queryList({ ...base, items: db.comments }).items[0].id);
  });

  it('falls back to default page size for invalid values', () => {
    const result = queryList({ ...base, items: db.comments, query: { page: 1, pageSize: 33 } });
    expect(result.pageSize).toBe(10);
  });

  it('filters before sorting and sorting before pagination', () => {
    const result = queryList({
      ...base,
      items: db.comments,
      query: { page: 1, pageSize: 10, sortBy: 'publishedAt', sortOrder: 'asc' as const },
      defaultSort: { field: 'publishedAt', order: 'desc', compare: (a, b) => a.publishedAt.localeCompare(b.publishedAt) },
      sortable: { publishedAt: (a, b) => a.publishedAt.localeCompare(b.publishedAt) },
    });
    const dates = result.items.map((c) => c.publishedAt);
    expect([...dates].sort()).toEqual(dates);
  });

  it('searches by keyword across text fields', () => {
    const result = queryList({
      ...base,
      items: db.comments,
      query: { page: 1, pageSize: 10, keyword: '官方说明' },
    });
    expect(result.total).toBeGreaterThan(0);
    for (const item of result.items) expect(item.text).toContain('官方说明');
  });
});
