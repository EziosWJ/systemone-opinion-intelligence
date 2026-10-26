import { http, HttpResponse } from 'msw';
import { env } from '../config/env';
import { captureHandlers } from './captureHandlers';
import { analysisHandlers } from './analysisHandlers';
import { topicReportHandlers } from './topicReportHandlers';
import { db, NotFoundError, ValidationError, queryList, type ListFilter } from './db/database';
import { SEED_NOW } from './data/seed';
import type { ListQuery, PaginatedResponse } from '../types/api';

const badRequest = (message: string, code: string, details?: Record<string, unknown>) =>
  HttpResponse.json({ message, code, details }, { status: 400 });
const notFound = (message: string, code: string, details?: Record<string, unknown>) =>
  HttpResponse.json({ message, code, details }, { status: 404 });
const conflict = (message: string, code: string, details?: Record<string, unknown>) =>
  HttpResponse.json({ message, code, details }, { status: 409 });

interface ParsedListQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters: ListFilter;
}

function parseListQuery(request: Request): ParsedListQuery {
  const url = new URL(request.url);
  const num = (key: string): number | undefined => {
    const raw = url.searchParams.get(key);
    if (raw === null || raw === '') return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const str = (key: string): string | undefined => {
    const raw = url.searchParams.get(key);
    return raw === null || raw === '' ? undefined : raw;
  };
  return {
    page: num('page') ?? 1,
    pageSize: num('pageSize') ?? 10,
    keyword: str('keyword'),
    sortBy: str('sortBy'),
    sortOrder: str('sortOrder') === 'asc' ? 'asc' : str('sortOrder') === 'desc' ? 'desc' : undefined,
    filters: {
      topicId: str('topicId'),
      postId: str('postId'),
      status: str('status'),
      mode: str('mode'),
      ruleId: str('ruleId'),
      reviewStatus: str('reviewStatus'),
      sentiment: str('sentiment'),
      from: str('from'),
      to: str('to'),
      minRelevance: num('minRelevance'),
      maxRelevance: num('maxRelevance'),
      minIrony: num('minIrony'),
      maxIrony: num('maxIrony'),
      minPriority: num('minPriority'),
      maxPriority: num('maxPriority'),
      tag: str('tag'),
      analysisTaskId: str('analysisTaskId'),
      captureTaskId: str('captureTaskId'),
    },
  };
}

const inDateRange = (iso: string, from?: string, to?: string): boolean => {
  if (from && iso.slice(0, 10) < from) return false;
  if (to && iso.slice(0, 10) > to) return false;
  return true;
};

function postTopicIds(postId: string): string[] {
  return db.posts.find((post) => post.id === postId)?.topicIds ?? [];
}

/** Aggregate dashboard summary computed from the live in-memory DB. */
function dashboardSummary(range: string) {
  const days = range === '30d' ? 30 : range === '14d' ? 14 : 7;
  const now = new Date(SEED_NOW);
  const fromMs = now.getTime() - days * 24 * 3600 * 1000;
  const commentsInRange = db.comments.filter((c) => new Date(c.publishedAt).getTime() >= fromMs);
  const analyzedCommentIds = new Set(db.analysisResults.map((r) => r.commentId));
  const pendingReviewResultIds = db.analysisResults.filter((r) => {
    const status = db.currentReviewStatus(r.id);
    return status === 'pending' || status === 'uncertain';
  }).map((r) => r.id);
  const activeCaptureTasks = db.captureTasks.filter((t) => t.status === 'pending' || t.status === 'running').length;

  const dayBuckets = new Map<string, { collected: number; analyzed: number }>();
  for (const comment of db.comments) {
    const day = comment.publishedAt.slice(0, 10);
    const bucket = dayBuckets.get(day) ?? { collected: 0, analyzed: 0 };
    bucket.collected += 1;
    if (analyzedCommentIds.has(comment.id)) bucket.analyzed += 1;
    dayBuckets.set(day, bucket);
  }
  const trend = [...dayBuckets.entries()]
    .filter(([day]) => day >= new Date(fromMs).toISOString().slice(0, 10))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, value]) => ({ day, ...value }));

  const sentimentCounts: Record<string, number> = {};
  for (const result of db.analysisResults) {
    sentimentCounts[result.sentiment] = (sentimentCounts[result.sentiment] ?? 0) + 1;
  }

  const topicRanking = db.topics
    .map((topic) => {
      const commentIds = db.topicCommentIds(topic.id);
      return {
        topicId: topic.id,
        title: topic.title,
        commentCount: commentIds.length,
        analyzedCount: commentIds.filter((id) => analyzedCommentIds.has(id)).length,
      };
    })
    .sort((a, b) => b.commentCount - a.commentCount);

  return {
    range,
    generatedAt: SEED_NOW,
    kpi: {
      totalComments: db.comments.length,
      totalPosts: db.posts.length,
      commentsInRange: commentsInRange.length,
      analyzedComments: analyzedCommentIds.size,
      pendingReviews: pendingReviewResultIds.length,
      activeCaptureTasks,
      totalCaptureTasks: db.captureTasks.length,
      analysisTasks: db.analysisTasks.length,
    },
    trend,
    sentiment: Object.entries(sentimentCounts).map(([sentiment, count]) => ({ sentiment, count })),
    topicRanking,
  };
}

export const handlers = [
  ...captureHandlers,
  ...analysisHandlers,
  ...topicReportHandlers,
  http.get(`${env.apiBaseUrl}/meta`, () =>
    HttpResponse.json({
      app: 'systemone-opinion-intelligence',
      mode: 'mock',
      phase: 'business-demo',
      dataReady: true,
      generatedAt: SEED_NOW,
    }),
  ),

  http.get(`${env.apiBaseUrl}/dashboard/summary`, ({ request }) => {
    const range = new URL(request.url).searchParams.get('range') ?? '7d';
    return HttpResponse.json(dashboardSummary(range));
  }),

  http.get(`${env.apiBaseUrl}/posts`, ({ request }) => {
    const q = parseListQuery(request);
    const filters = q.filters;
    const response = queryList<SocialPostShape>({
      items: db.posts,
      query: { ...q, keyword: q.keyword },
      idOf: (p) => p.id,
      defaultSort: { field: 'publishedAt', order: 'desc', compare: (a, b) => a.publishedAt.localeCompare(b.publishedAt) },
      sortable: {
        publishedAt: (a, b) => a.publishedAt.localeCompare(b.publishedAt),
        text: (a, b) => a.text.localeCompare(b.text),
        commentCount: (a, b) => commentCount(a.id) - commentCount(b.id),
      },
      textOf: (p) => [p.text, p.sourceId, p.id],
      filter: (p) => (!filters.topicId || p.topicIds.includes(filters.topicId)) && inDateRange(p.publishedAt, filters.from, filters.to),
    });
    return HttpResponse.json({
      ...response,
      items: response.items.map((post) => ({ ...post, commentCount: commentCount(post.id) })),
    });
  }),

  http.get(`${env.apiBaseUrl}/posts/:id`, ({ params }) => {
    const post = db.getPost(String(params.id));
    if (!post) return notFound('目标微博不存在', 'POST_NOT_FOUND', { id: String(params.id) });
    return HttpResponse.json({
      ...post,
      commentCount: commentCount(post.id),
      comments: db.comments.filter((c) => c.postId === post.id).slice(0, 5).map((c) => ({ id: c.id, text: c.text, publishedAt: c.publishedAt })),
    });
  }),

  http.get(`${env.apiBaseUrl}/comments`, ({ request }) => {
    const q = parseListQuery(request);
    const filters = q.filters;
    const topicPostIds = filters.topicId
      ? new Set(db.posts.filter((p) => p.topicIds.includes(filters.topicId!)).map((p) => p.id))
      : undefined;
    const response = queryList<CommentShape>({
      items: db.comments,
      query: q,
      idOf: (c) => c.id,
      defaultSort: { field: 'publishedAt', order: 'desc', compare: (a, b) => a.publishedAt.localeCompare(b.publishedAt) },
      sortable: {
        publishedAt: (a, b) => a.publishedAt.localeCompare(b.publishedAt),
        text: (a, b) => a.text.localeCompare(b.text),
      },
      textOf: (c) => [c.text, c.sourceId, c.id],
      filter: (c) =>
        (!filters.postId || c.postId === filters.postId) &&
        (!topicPostIds || topicPostIds.has(c.postId)) &&
        inDateRange(c.publishedAt, filters.from, filters.to),
    });
    return HttpResponse.json({
      ...response,
      items: response.items.map(enrichComment),
    });
  }),

  http.get(`${env.apiBaseUrl}/comments/:id`, ({ params }) => {
    const comment = db.getComment(String(params.id));
    if (!comment) return notFound('目标评论不存在', 'COMMENT_NOT_FOUND', { id: String(params.id) });
    const post = db.getPost(comment.postId);
    return HttpResponse.json({
      ...enrichComment(comment),
      post: post
        ? { id: post.id, url: post.url, text: post.text, publishedAt: post.publishedAt, topicIds: post.topicIds }
        : null,
    });
  }),

  http.get(`${env.apiBaseUrl}/topics`, ({ request }) => {
    const q = parseListQuery(request);
    const response = queryList({
      items: db.topics as TopicShape[],
      query: q,
      idOf: (t) => t.id,
      defaultSort: { field: 'createdAt', order: 'asc', compare: (a, b) => a.createdAt.localeCompare(b.createdAt) },
      sortable: { createdAt: (a, b) => a.createdAt.localeCompare(b.createdAt), title: (a, b) => a.title.localeCompare(b.title) },
      textOf: (t) => [t.title, t.summary, ...t.keywords, t.id],
    });
    return HttpResponse.json({
      ...response,
      items: response.items.map((topic) => ({
        ...topic,
        postCount: db.posts.filter((p) => p.topicIds.includes(topic.id)).length,
        commentCount: db.topicCommentIds(topic.id).length,
      })),
    });
  }),

  http.post(`${env.apiBaseUrl}/topics`, async ({ request }) => {
    const body = (await request.json()) as { title?: string; summary?: string; keywords?: string[] };
    if (!body.title?.trim()) return badRequest('专题标题不能为空', 'TITLE_REQUIRED');
    if (db.topics.some((t) => t.title === body.title!.trim())) return conflict('同名专题已存在', 'TOPIC_DUPLICATE');
    const topic = {
      id: db.nextId('topic', 'topic', 3),
      title: body.title.trim(),
      summary: body.summary?.trim() ?? '',
      keywords: [...new Set((body.keywords ?? []).map((k) => k.trim()).filter(Boolean))],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.topics.push(topic);
    return HttpResponse.json(topic, { status: 201 });
  }),

  http.get(`${env.apiBaseUrl}/topics/:id`, ({ params }) => {
    const topic = db.getTopic(String(params.id));
    if (!topic) return notFound('目标专题不存在', 'TOPIC_NOT_FOUND', { id: String(params.id) });
    return HttpResponse.json({
      ...topic,
      postCount: db.posts.filter((p) => p.topicIds.includes(topic.id)).length,
      commentCount: db.topicCommentIds(topic.id).length,
    });
  }),
];

import type { SocialPost, SocialComment, Topic } from '../types/entities';

type SocialPostShape = SocialPost;
type TopicShape = Topic;
type CommentShape = SocialComment;
function commentCount(postId: string): number {
  return db.comments.reduce((count, comment) => (comment.postId === postId ? count + 1 : count), 0);
}

function enrichComment(comment: CommentShape) {
  const post = db.getPost(comment.postId);
  return {
    ...comment,
    postText: post?.text ?? null,
    postUrl: post?.url ?? null,
    postPublishedAt: post?.publishedAt ?? null,
    topicIds: post ? postTopicIds(post.id) : [],
  };
}

export { ValidationError, NotFoundError };
export type { ListQuery, PaginatedResponse };
