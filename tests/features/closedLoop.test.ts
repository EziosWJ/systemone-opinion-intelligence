import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/mocks/db/database';
import { captureApi } from '../../src/features/capture/api/capture.api';
import { analysisApi } from '../../src/features/analysis/api/analysis.api';
import { topicsApi } from '../../src/features/topics/api/topics.api';
import { reportsApi } from '../../src/features/reports/api/reports.api';
import { unwrap, apiClient } from '../../src/lib/api/client';

beforeAll(() => {
  db.reset();
});

async function blobToText(input: unknown): Promise<string> {
  if (typeof input === 'string') return input;
  const blob = input as Blob;
  if (typeof blob.text === 'function') return blob.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

async function driveCaptureToCompletion(taskId: string) {
  let task = await captureApi.advance(taskId);
  let guard = 0;
  while (task.status !== 'completed' && task.status !== 'failed' && guard < 20) {
    task = await captureApi.advance(taskId);
    guard += 1;
  }
  return task;
}

async function driveAnalysisToCompletion(taskId: string) {
  let task = await analysisApi.advanceTask(taskId);
  let guard = 0;
  while (task.status !== 'completed' && task.status !== 'failed' && guard < 20) {
    task = await analysisApi.advanceTask(taskId);
    guard += 1;
  }
  return task;
}

/** Issue #10 acceptance: full business closed loop in one session. */
describe('V1 full business closed loop', () => {
  it('capture → analyze → review → topic → report with consistent aggregates', async () => {
    // 1. Capture: create a keyword task and drive it to completion.
    const commentsBefore = db.comments.length;
    const captureTask = await captureApi.create({ mode: 'keyword', input: '滨水绿道开放' });
    const finishedCapture = await driveCaptureToCompletion(captureTask.id);
    expect(finishedCapture.status).toBe('completed');
    expect(db.comments.length).toBeGreaterThan(commentsBefore);

    // 2. Analyze: create an analysis task over a small slice and drive it.
    const slice = db.comments.slice(0, 30).map((c) => c.id);
    const analysisTask = await analysisApi.createTask({ ruleId: 'rule_semantics', commentIds: slice });
    const finishedAnalysis = await driveAnalysisToCompletion(analysisTask.id);
    expect(finishedAnalysis.status).toBe('completed');
    expect(finishedAnalysis.processed).toBe(finishedAnalysis.total);

    // 3. Results carry the full multi-dimensional contract.
    const results = await analysisApi.results({ page: 1, pageSize: 50 });
    expect(results.total).toBeGreaterThanOrEqual(30);
    for (const row of results.items) {
      expect(row.relevance).toBeGreaterThanOrEqual(0);
      expect(row.relevance).toBeLessThanOrEqual(100);
      expect(row.ironyProbability).toBeGreaterThanOrEqual(0);
      expect(row.ironyProbability).toBeLessThanOrEqual(100);
      expect(['positive', 'neutral', 'negative', 'mixed', 'unclear']).toContain(row.sentiment);
      expect(row.confidence).toBeGreaterThan(0);
      expect(row.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(row.tags)).toBe(true);
      expect(Array.isArray(row.evidence)).toBe(true);
      expect(row.ruleId).toBeTruthy();
      expect(typeof row.ruleVersion).toBe('number');
    }

    // 4. Determinism: the same comment analyzed twice yields identical scores.
    const deterministic = await analysisApi.createTask({ ruleId: 'rule_semantics', commentIds: slice.slice(0, 3) });
    await driveAnalysisToCompletion(deterministic.id);
    const firstThree = await analysisApi.results({ page: 1, pageSize: 100, analysisTaskId: analysisTask.id });
    const secondThree = await analysisApi.results({ page: 1, pageSize: 100, analysisTaskId: deterministic.id });
    const byComment = new Map(secondThree.items.map((r) => [r.commentId, r]));
    for (const row of firstThree.items.slice(0, 3)) {
      const twin = byComment.get(row.commentId);
      if (!twin) continue;
      expect(twin.relevance).toBe(row.relevance);
      expect(twin.ironyProbability).toBe(row.ironyProbability);
      expect(twin.sentiment).toBe(row.sentiment);
    }

    // 5. Review: submit, check queue sync and history retention.
    const target = results.items[0];
    const decision1 = await analysisApi.submitReview(target.id, { status: 'uncertain', note: '上下文不足' });
    expect(decision1.status).toBe('uncertain');
    const queue = await analysisApi.reviews({ page: 1, pageSize: 100, status: 'uncertain' });
    expect(queue.items.some((row) => row.id === target.id)).toBe(true);
    const decision2 = await analysisApi.submitReview(target.id, { status: 'confirmed' });
    const history = await analysisApi.reviewHistory(target.id);
    expect(history.items).toHaveLength(2);
    expect(history.items[1].id).toBe(decision2.id);
    const afterConfirm = await analysisApi.reviews({ page: 1, pageSize: 100, status: 'pending' });
    expect(afterConfirm.items.some((row) => row.id === target.id)).toBe(false);

    // 6. Invalid review status is rejected.
    await expect(
      unwrap(apiClient.post(`/analysis/results/${target.id}/reviews`, { status: 'bogus' })),
    ).rejects.toMatchObject({ response: { status: 400 } });

    // 7. Topic: create, link comments, insights reflect the same numbers.
    const topic = await topicsApi.create({ title: '闭环验证专题', summary: '端到端测试', keywords: ['闭环'] });
    const linked = await topicsApi.linkComments(topic.id, slice.slice(0, 5));
    expect(linked.linked).toBe(5);
    const insights = await topicsApi.insights(topic.id);
    expect(insights.totalComments).toBeGreaterThanOrEqual(5);
    expect(insights.analyzedComments).toBeGreaterThanOrEqual(5);
    expect(insights.representative.length).toBeGreaterThan(0);

    // 8. Report: generate, verify snapshot consistency, edit, export HTML.
    const report = await reportsApi.create(topic.id);
    expect(report.status).toBe('draft');
    expect(report.snapshot.topicId).toBe(topic.id);
    expect(report.snapshot.totalComments).toBe(insights.totalComments);
    expect(report.contentMarkdown).toContain('不确定');
    expect(report.contentMarkdown).toContain('模拟');

    const updated = await reportsApi.update(report.id, { contentMarkdown: '# 编辑后的正文\n\n自定义内容。', status: 'ready' });
    expect(updated.contentMarkdown).toContain('编辑后的正文');
    const detail = await reportsApi.detail(report.id);
    expect(detail.contentMarkdown).toBe(updated.contentMarkdown);

    const htmlBlob = await reportsApi.exportHtml(report.id);
    const html = await blobToText(htmlBlob);
    expect(html).toContain('编辑后的正文');
    expect(html).toContain('SystemOne V1 演示报告');
    const exported = await reportsApi.detail(report.id);
    expect(exported.status).toBe('exported');
  });

  it('dashboard summary stays consistent with the DB after mutations', async () => {
    const summary = await unwrap(apiClient.get('/dashboard/summary', { params: { range: '7d' } }));
    expect(summary.kpi.totalComments).toBe(db.comments.length);
    expect(summary.kpi.totalPosts).toBe(db.posts.length);
    const analyzedIds = new Set(db.analysisResults.map((r) => r.commentId));
    expect(summary.kpi.analyzedComments).toBe(analyzedIds.size);
    const pending = db.analysisResults.filter((r) => {
      const status = db.currentReviewStatus(r.id);
      return status === 'pending' || status === 'uncertain';
    }).length;
    expect(summary.kpi.pendingReviews).toBe(pending);
  });

  it('URL filters drive server-side filtering consistently', async () => {
    const topic = db.topics[0];
    const comments = await unwrap(apiClient.get('/comments', { params: { topicId: topic.id, page: 1, pageSize: 20 } }));
    const postIds = new Set(db.posts.filter((p) => p.topicIds.includes(topic.id)).map((p) => p.id));
    expect(comments.total).toBeGreaterThan(0);
    for (const item of comments.items) expect(postIds.has(item.postId)).toBe(true);
  });
});
