import { describe, expect, it } from 'vitest';
import { buildSeedData, SEED_COMMENTS, SEED_POSTS, SEED_TOPICS } from '../../src/mocks/data/seed';

describe('deterministic seed data', () => {
  it('generates the contracted volume (4 topics / 300 posts / 10k comments)', () => {
    const seed = buildSeedData();
    expect(seed.topics).toHaveLength(SEED_TOPICS);
    expect(seed.posts).toHaveLength(SEED_POSTS);
    expect(seed.comments).toHaveLength(SEED_COMMENTS);
  });

  it('is fully reproducible across builds', () => {
    const a = buildSeedData();
    const b = buildSeedData();
    expect(a.posts[0]).toEqual(b.posts[0]);
    expect(a.comments[4321]).toEqual(b.comments[4321]);
    expect(a.topics.map((t) => t.id)).toEqual(b.topics.map((t) => t.id));
  });

  it('keeps every foreign key valid', () => {
    const seed = buildSeedData();
    const postIds = new Set(seed.posts.map((p) => p.id));
    const topicIds = new Set(seed.topics.map((t) => t.id));
    for (const post of seed.posts) {
      for (const topicId of post.topicIds) expect(topicIds.has(topicId)).toBe(true);
    }
    for (const comment of seed.comments) {
      expect(postIds.has(comment.postId)).toBe(true);
    }
    for (const task of seed.captureTasks) {
      expect(task.processed).toBe(task.total);
      expect(task.processed).toBeGreaterThan(0);
    }
  });

  it('has unique IDs and dates formatted as ISO 8601', () => {
    const seed = buildSeedData();
    expect(new Set(seed.posts.map((p) => p.id)).size).toBe(seed.posts.length);
    expect(new Set(seed.comments.map((c) => c.id)).size).toBe(seed.comments.length);
    for (const comment of seed.comments) {
      expect(comment.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });
});
