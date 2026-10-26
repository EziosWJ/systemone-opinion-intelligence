import { http, HttpResponse } from 'msw';
import { env } from '../config/env';
import { analyzeComment, db } from './db/database';
import type { AnalysisResult, AnalysisTask, ReviewDecision } from '../types/entities';

const badRequest = (message: string, code: string) => HttpResponse.json({ message, code }, { status: 400 });
const notFound = (message: string, code: string) => HttpResponse.json({ message, code }, { status: 404 });
const conflict = (message: string, code: string) => HttpResponse.json({ message, code }, { status: 409 });

export interface AnalysisTaskWithExtras extends AnalysisTask {
  resultCount: number;
}

function resultReviewStatus(result: AnalysisResult): string {
  return db.currentReviewStatus(result.id);
}

function enrichResult(result: AnalysisResult) {
  const comment = db.getComment(result.commentId);
  const post = comment ? db.getPost(comment.postId) : undefined;
  return {
    ...result,
    reviewStatus: resultReviewStatus(result),
    commentText: comment?.text ?? null,
    postText: post?.text ?? null,
    postUrl: post?.url ?? null,
    postId: comment?.postId ?? null,
    commentPublishedAt: comment?.publishedAt ?? null,
  };
}

/** Demo-only progress driver: processes a deterministic slice of the task's
 * comments per call, writing real AnalysisResults into the DB. */
function advanceAnalysisTask(task: AnalysisTask): AnalysisTask {
  if (task.status === 'completed' || task.status === 'failed' || task.status === 'canceled') return task;
  const chunk = Math.max(1, Math.ceil(task.total / 3));
  const target = Math.min(task.total, task.processed + chunk);
  const existing = new Set(db.analysisResults.filter((r) => r.analysisTaskId === task.id).map((r) => r.commentId));
  const now = new Date().toISOString();
  while (task.processed < target) {
    const commentId = task.commentIds[task.processed];
    task.processed += 1;
    if (existing.has(commentId)) continue;
    const comment = db.getComment(commentId);
    if (!comment) continue;
    const post = db.getPost(comment.postId);
    const base = analyzeComment(
      {
        commentId: comment.id,
        text: comment.text,
        postContext: post?.text ?? '',
        ruleId: task.ruleId,
        ruleVersion: task.ruleVersion,
        taskId: task.id,
      },
      task.processed,
    );
    db.analysisResults.push({ ...base, id: db.nextId('res', 'res', 6), createdAt: now });
  }
  task.status = task.processed >= task.total ? 'completed' : 'running';
  return task;
}

export const analysisHandlers = [
  http.get(`${env.apiBaseUrl}/analysis/rules`, () =>
    HttpResponse.json({ items: db.analysisRules, total: db.analysisRules.length, page: 1, pageSize: 50 }),
  ),

  http.post(`${env.apiBaseUrl}/analysis/rules`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { name?: string; promptTemplate?: string; dimensions?: string[] };
    if (!body.name?.trim()) return badRequest('规则名称不能为空', 'NAME_REQUIRED');
    const existing = db.analysisRules.find((rule) => rule.id === 'rule_custom');
    if (existing && body.name === existing.name) return conflict('同名规则已存在', 'RULE_DUPLICATE');
    const rule = {
      id: 'rule_custom',
      name: body.name.trim(),
      version: 1,
      dimensions: (body.dimensions as Array<'relevance' | 'irony' | 'sentiment' | 'reviewPriority'>) ?? ['relevance', 'reviewPriority'],
      promptTemplate: body.promptTemplate?.trim() || '自定义规则模板（模拟评分）。',
      outputSchemaVersion: 'v1',
    };
    if (existing) {
      rule.version = existing.version + 1;
      db.analysisRules[db.analysisRules.indexOf(existing)] = rule;
    } else {
      db.analysisRules.push(rule);
    }
    return HttpResponse.json(rule, { status: 201 });
  }),

  http.get(`${env.apiBaseUrl}/analysis/tasks`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? undefined;
    const ruleId = url.searchParams.get('ruleId') ?? undefined;
    let rows = db.analysisTasks;
    if (status) rows = rows.filter((task) => task.status === status);
    if (ruleId) rows = rows.filter((task) => task.ruleId === ruleId);
    rows = [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 10);
    const start = (page - 1) * pageSize;
    const items = rows.slice(start, start + pageSize).map((task) => ({
      ...task,
      resultCount: db.analysisResults.filter((r) => r.analysisTaskId === task.id).length,
    }));
    return HttpResponse.json({ items, total: rows.length, page, pageSize });
  }),

  http.post(`${env.apiBaseUrl}/analysis/tasks`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      ruleId?: string;
      ruleVersion?: number;
      commentIds?: string[];
      topicId?: string;
      limit?: number;
    };
    if (!body.ruleId || !db.analysisRules.some((rule) => rule.id === body.ruleId)) {
      return badRequest('规则不存在', 'RULE_NOT_FOUND');
    }
    let commentIds = body.commentIds ?? [];
    if (!commentIds.length && body.topicId) {
      commentIds = db.topicCommentIds(body.topicId).slice(0, Math.min(body.limit ?? 200, 500));
    }
    if (!commentIds.length) commentIds = db.comments.slice(0, Math.min(body.limit ?? 100, 500)).map((c) => c.id);
    const missing = commentIds.filter((id) => !db.getComment(id));
    if (missing.length) return badRequest(`以下评论不存在：${missing.slice(0, 3).join(', ')}`, 'COMMENT_NOT_FOUND');
    const rule = db.analysisRules.find((r: { id: string }) => r.id === body.ruleId)!;
    const task: AnalysisTask = {
      id: db.nextId('ant', 'ant', 3),
      ruleId: body.ruleId,
      ruleVersion: body.ruleVersion ?? rule.version,
      commentIds,
      status: 'pending',
      total: commentIds.length,
      processed: 0,
      createdAt: new Date().toISOString(),
    };
    db.analysisTasks.push(task);
    return HttpResponse.json(task, { status: 201 });
  }),

  http.get(`${env.apiBaseUrl}/analysis/tasks/:id`, ({ params }) => {
    const task = db.getAnalysisTask(String(params.id));
    if (!task) return notFound('分析任务不存在', 'ANALYSIS_TASK_NOT_FOUND');
    return HttpResponse.json({
      ...task,
      resultCount: db.analysisResults.filter((r) => r.analysisTaskId === task.id).length,
    });
  }),

  http.post(`${env.apiBaseUrl}/analysis/tasks/:id/advance`, ({ params }) => {
    const task = db.getAnalysisTask(String(params.id));
    if (!task) return notFound('分析任务不存在', 'ANALYSIS_TASK_NOT_FOUND');
    return HttpResponse.json(advanceAnalysisTask(task));
  }),

  http.get(`${env.apiBaseUrl}/analysis/results`, ({ request }) => {
    const url = new URL(request.url);
    const num = (key: string) => {
      const raw = url.searchParams.get(key);
      return raw === null || raw === '' ? undefined : Number(raw);
    };
    const str = (key: string) => url.searchParams.get(key) ?? undefined;
    const filters = {
      reviewStatus: str('reviewStatus'),
      sentiment: str('sentiment'),
      ruleId: str('ruleId'),
      tag: str('tag'),
      topicId: str('topicId'),
      analysisTaskId: str('analysisTaskId'),
      minRelevance: num('minRelevance'),
      maxRelevance: num('maxRelevance'),
      minIrony: num('minIrony'),
      maxIrony: num('maxIrony'),
      minPriority: num('minPriority'),
      maxPriority: num('maxPriority'),
      from: str('from'),
      to: str('to'),
    };
    const keyword = (str('keyword') ?? '').trim().toLowerCase();
    const sortBy = str('sortBy') ?? 'reviewPriority';
    const sortOrder = str('sortOrder') === 'asc' ? 'asc' : 'desc';

    const topicCommentIds = filters.topicId ? new Set(db.topicCommentIds(filters.topicId)) : undefined;
    let rows = db.analysisResults.map(enrichResult).filter((result) => {
      if (filters.reviewStatus && result.reviewStatus !== filters.reviewStatus) return false;
      if (filters.sentiment && result.sentiment !== filters.sentiment) return false;
      if (filters.ruleId && result.ruleId !== filters.ruleId) return false;
      if (filters.analysisTaskId && result.analysisTaskId !== filters.analysisTaskId) return false;
      if (filters.tag && !result.tags.includes(filters.tag)) return false;
      if (topicCommentIds && !topicCommentIds.has(result.commentId)) return false;
      if (filters.minRelevance !== undefined && result.relevance < filters.minRelevance) return false;
      if (filters.maxRelevance !== undefined && result.relevance > filters.maxRelevance) return false;
      if (filters.minIrony !== undefined && result.ironyProbability < filters.minIrony) return false;
      if (filters.maxIrony !== undefined && result.ironyProbability > filters.maxIrony) return false;
      if (filters.minPriority !== undefined && result.reviewPriority < filters.minPriority) return false;
      if (filters.maxPriority !== undefined && result.reviewPriority > filters.maxPriority) return false;
      if (filters.from && (result.commentPublishedAt ?? '') < filters.from) return false;
      if (filters.to && (result.commentPublishedAt ?? '') > `${filters.to}T99`) return false;
      if (keyword && !result.commentText?.toLowerCase().includes(keyword) && !result.id.includes(keyword)) return false;
      return true;
    });

    const comparators: Record<string, (a: (typeof rows)[number], b: (typeof rows)[number]) => number> = {
      relevance: (a, b) => a.relevance - b.relevance,
      ironyProbability: (a, b) => a.ironyProbability - b.ironyProbability,
      reviewPriority: (a, b) => a.reviewPriority - b.reviewPriority,
      confidence: (a, b) => a.confidence - b.confidence,
      createdAt: (a, b) => a.createdAt.localeCompare(b.createdAt),
    };
    const comparator = comparators[sortBy];
    if (comparator) {
      rows = [...rows].sort((a, b) => {
        const base = comparator(a, b);
        if (base !== 0) return sortOrder === 'asc' ? base : -base;
        return a.id < b.id ? -1 : 1;
      });
    }

    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 10);
    const start = (page - 1) * pageSize;
    return HttpResponse.json({ items: rows.slice(start, start + pageSize), total: rows.length, page, pageSize });
  }),

  http.get(`${env.apiBaseUrl}/analysis/results/:id`, ({ params }) => {
    const result = db.analysisResults.find((r) => r.id === String(params.id));
    if (!result) return notFound('分析结果不存在', 'RESULT_NOT_FOUND');
    const decisions = db.reviewDecisions.filter((d) => d.resultId === result.id);
    return HttpResponse.json({ ...enrichResult(result), reviewHistory: decisions });
  }),

  http.get(`${env.apiBaseUrl}/analysis/results/:id/reviews`, ({ params }) => {
    const resultId = String(params.id);
    if (!db.analysisResults.some((r) => r.id === resultId)) return notFound('分析结果不存在', 'RESULT_NOT_FOUND');
    return HttpResponse.json({ items: db.reviewDecisions.filter((d) => d.resultId === resultId) });
  }),

  http.post(`${env.apiBaseUrl}/analysis/results/:id/reviews`, async ({ request, params }) => {
    const resultId = String(params.id);
    const result = db.analysisResults.find((r) => r.id === resultId);
    if (!result) return notFound('分析结果不存在', 'RESULT_NOT_FOUND');
    const body = (await request.json().catch(() => ({}))) as { status?: string; note?: string };
    if (!body.status || !['confirmed', 'uncertain', 'rejected'].includes(body.status)) {
      return badRequest('复核结论必须为 confirmed / uncertain / rejected', 'INVALID_REVIEW_STATUS');
    }
    const decision = db.addReviewDecision(resultId, body.status as ReviewDecision['status'], body.note?.trim() || undefined);
    return HttpResponse.json(decision, { status: 201 });
  }),

  http.get(`${env.apiBaseUrl}/reviews`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'pending';
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 10);
    const keyword = (url.searchParams.get('keyword') ?? '').trim().toLowerCase();
    let rows = db.analysisResults
      .map(enrichResult)
      .filter((result) => (status === 'all' ? true : result.reviewStatus === status));
    if (keyword) {
      rows = rows.filter((result) => result.commentText?.toLowerCase().includes(keyword) || result.id.includes(keyword));
    }
    rows = [...rows].sort((a, b) => b.reviewPriority - a.reviewPriority || (a.id < b.id ? -1 : 1));
    const start = (page - 1) * pageSize;
    return HttpResponse.json({ items: rows.slice(start, start + pageSize), total: rows.length, page, pageSize });
  }),
];

export { advanceAnalysisTask, enrichResult };
