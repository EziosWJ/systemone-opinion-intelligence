import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/mocks/db/database';
import { advanceCaptureTask } from '../../src/mocks/captureHandlers';
import { captureApi } from '../../src/features/capture/api/capture.api';

beforeAll(() => {
  db.reset();
});

describe('capture task API via MSW', () => {
  it('rejects an invalid URL mode task', async () => {
    await expect(captureApi.create({ mode: 'url', input: 'not-a-url' })).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it('rejects an empty keyword', async () => {
    await expect(captureApi.create({ mode: 'keyword', input: 'a' })).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it('creates, advances and completes a keyword task producing real posts/comments', async () => {
    const beforePosts = db.posts.length;
    const beforeComments = db.comments.length;
    const task = await captureApi.create({ mode: 'keyword', input: '城市绿道体验' });
    expect(task.status).toBe('pending');
    expect(task.total).toBe(12);

    let current = task;
    let guard = 0;
    while (current.status !== 'completed' && guard < 10) {
      current = await captureApi.advance(current.id);
      guard += 1;
    }
    expect(current.status).toBe('completed');
    expect(current.processed).toBe(current.total);
    expect(db.posts.length).toBeGreaterThan(beforePosts);
    expect(db.comments.length).toBeGreaterThan(beforeComments);
  });

  it('returns 404 for a missing task', async () => {
    await expect(captureApi.advance('cap_missing')).rejects.toMatchObject({
      response: { status: 404 },
    });
  });

  it('advancing a task twice does not duplicate processed records', () => {
    const task = db.captureTasks[0];
    const after = advanceCaptureTask({ ...task, status: 'pending', processed: 0 });
    expect(after.processed).toBeLessThanOrEqual(after.total);
  });

  it('simulates a deterministic failure for the demo failure keyword', async () => {
    const task = await captureApi.create({ mode: 'keyword', input: '失败演示' });
    const failed = await captureApi.advance(task.id);
    expect(failed.status).toBe('failed');
    expect(failed.error).toContain('模拟采集失败');
  });
});

describe('comments and posts query APIs', () => {
  it('filters comments by postId and enriches with post context', async () => {
    const post = db.posts[0];
    const response = await (await import('../../src/features/capture/api/comments.api')).commentsApi.list({
      page: 1,
      pageSize: 20,
      postId: post.id,
    });
    expect(response.total).toBeGreaterThan(0);
    for (const item of response.items) {
      expect(item.postId).toBe(post.id);
      expect(item.postText).toBe(post.text);
    }
  });

  it('filters posts by topicId', async () => {
    const topic = db.topics[0];
    const response = await (await import('../../src/features/capture/api/posts.api')).postsApi.list({
      page: 1,
      pageSize: 10,
      topicId: topic.id,
    });
    expect(response.total).toBeGreaterThan(0);
    expect(response.total).toBeLessThanOrEqual(300);
  });

  it('returns a comment with its originating post or a null post fallback', async () => {
    const { commentsApi } = await import('../../src/features/capture/api/comments.api');
    const detail = await commentsApi.detail(db.comments[0].id);
    expect(detail.post?.id).toBe(db.comments[0].postId);
    await expect(commentsApi.detail('cmt_missing')).rejects.toMatchObject({ response: { status: 404 } });
  });
});
