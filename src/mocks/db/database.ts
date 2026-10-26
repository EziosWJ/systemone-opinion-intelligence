import { buildSeedData, SEED_NOW, type SeedData } from '../data/seed';
import { createRng, pick, randInt } from '../utils/rng';
import type {
  AnalysisResult,
  AnalysisTask,
  CaptureTask,
  ReviewDecision,
  Sentiment,
  SocialComment,
  SocialPost,
  Topic,
} from '../../types/entities';
import type { ListQuery, PaginatedResponse, SortOrder } from '../../types/api';

type ApiPaginated<T> = PaginatedResponse<T>;

export class ConflictError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];

export interface ListFilter {
  topicId?: string;
  postId?: string;
  status?: string;
  mode?: string;
  ruleId?: string;
  reviewStatus?: string;
  sentiment?: string;
  from?: string;
  to?: string;
  minRelevance?: number;
  maxRelevance?: number;
  minIrony?: number;
  maxIrony?: number;
  minPriority?: number;
  maxPriority?: number;
  tag?: string;
  analysisTaskId?: string;
  captureTaskId?: string;
}

interface QueryOptions<T> {
  items: T[];
  query: Partial<ListQuery> & { filters?: ListFilter };
  idOf: (item: T) => string;
  defaultSort?: { field: string; order: SortOrder; compare: (a: T, b: T) => number };
  sortable?: Record<string, (a: T, b: T) => number>;
  textOf: (item: T) => string[];
  dateOf?: (item: T) => string | undefined;
  filter?: (item: T) => boolean;
}

/** Shared server-style list engine: filter → search → sort → paginate. */
export function queryList<T>(options: QueryOptions<T>): ApiPaginated<T> {
  const { items, query, idOf } = options;
  const page = Math.max(1, query.page ?? 1);
  const requested = query.pageSize ?? 10;
  const pageSize = ALLOWED_PAGE_SIZES.includes(requested) ? requested : 10;
  const keyword = (query.keyword ?? '').trim().toLowerCase();

  let rows = items.filter((item) => (options.filter ? options.filter(item) : true));

  if (keyword) {
    rows = rows.filter((item) => options.textOf(item).some((text) => text.toLowerCase().includes(keyword)));
  }

  const sortBy = query.sortBy ?? options.defaultSort?.field;
  const sortOrder: SortOrder = query.sortOrder ?? options.defaultSort?.order ?? 'desc';
  if (sortBy) {
    const compare =
      options.sortable?.[sortBy] ??
      (sortBy === options.defaultSort?.field ? options.defaultSort?.compare : undefined);
    if (compare) {
      rows = [...rows].sort((a, b) => {
        const base = compare(a, b);
        if (base !== 0) return sortOrder === 'asc' ? base : -base;
        return idOf(a) < idOf(b) ? -1 : idOf(a) > idOf(b) ? 1 : 0;
      });
    }
  }

  const total = rows.length;
  const start = (page - 1) * pageSize;
  return { items: rows.slice(start, start + pageSize), total, page, pageSize };
}

/** Mock analysis engine: deterministic per-comment scores derived from a
 * stable hash of the comment text, so identical inputs always produce
 * identical outputs across sessions. Scores are indicative only. */
export interface EngineInput {
  commentId: string;
  text: string;
  postContext: string;
  ruleId: string;
  ruleVersion: number;
  taskId: string;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const SENTIMENTS: Sentiment[] = ['positive', 'neutral', 'negative', 'mixed', 'unclear'];

export function analyzeComment(input: EngineInput, index: number): Omit<AnalysisResult, 'createdAt'> & { createdAt: string } {
  const hash = hashString(`${input.ruleId}:${input.ruleVersion}:${input.text}:${input.postContext}`);
  const rng = createRng(hash ^ (index * 7919));
  const ironyHint = /["“”]|呵呵|真是|说得真好听|雷声大雨点小/.test(input.text);

  const relevance = randInt(rng, 35, 98);
  const ironyProbability = ironyHint ? randInt(rng, 55, 92) : randInt(rng, 3, 40);
  const sentiment: Sentiment = input.text.length < 8 ? 'unclear' : pick(rng, SENTIMENTS);
  const reviewPriority = Math.min(
    100,
    Math.round(relevance * 0.5 + ironyProbability * 0.35 + (sentiment === 'negative' ? 18 : 6) + randInt(rng, -5, 5)),
  );
  const confidence = Math.round((0.45 + rng() * 0.4) * 100) / 100;

  const tags: string[] = [];
  if (ironyProbability >= 55) tags.push('反讽表达可能');
  if (relevance >= 80) tags.push('高相关');
  if (relevance < 50) tags.push('低相关');
  if (sentiment === 'negative') tags.push('负面情绪');
  if (sentiment === 'positive') tags.push('正面情绪');
  if (sentiment === 'unclear') tags.push('语义含混');
  if (reviewPriority >= 75) tags.push('建议复核');

  const evidence: string[] = [];
  if (ironyHint) evidence.push(`原文片段：“${input.text.slice(0, 30)}” 出现夸张赞许或转折表达`);
  if (input.postContext) evidence.push(`原帖上下文：${input.postContext.slice(0, 40)}`);
  if (input.text.length < 8) evidence.push('评论文本过短，缺少上下文，标记为 unclear');

  const explanation = ironyHint
    ? '可能存在反讽表达；仅根据文本及原帖上下文辅助判断，不代表发言者真实意图，需人工复核确认。'
    : relevance >= 80
      ? '评论与所选专题内容高度相关，情绪表达较明确，属模拟评分辅助判断。'
      : '评论与专题相关性一般，建议结合原帖上下文人工核查。';

  return {
    id: '',
    commentId: input.commentId,
    analysisTaskId: input.taskId,
    ruleId: input.ruleId,
    ruleVersion: input.ruleVersion,
    relevance,
    ironyProbability,
    sentiment,
    reviewPriority,
    tags,
    evidence,
    explanation,
    confidence,
    createdAt: SEED_NOW,
  };
}

/**
 * In-memory mock database. One instance per session (browser or test file);
 * refresh resets it. All handlers read and write this single source.
 */
class MockDatabase {
  topics: Topic[] = [];
  posts: SocialPost[] = [];
  comments: SocialComment[] = [];
  captureTasks: CaptureTask[] = [];
  analysisRules: import('../../types/entities').AnalysisRule[] = [];
  analysisTasks: AnalysisTask[] = [];
  analysisResults: AnalysisResult[] = [];
  reviewDecisions: ReviewDecision[] = [];
  reports: Array<{
    id: string;
    topicId: string;
    title: string;
    status: 'draft' | 'ready' | 'exported';
    contentMarkdown: string;
    snapshot: string;
    generatedAt: string;
    updatedAt: string;
  }> = [];
  topicComments = new Map<string, Set<string>>();
  topicPosts = new Map<string, Set<string>>();
  private seq = { cap: 100, ant: 100, res: 0, rev: 0, topic: 100, cmt: 100_000, post: 10_000, rep: 0 };

  constructor() {
    this.reset();
  }

  reset(seed: SeedData = buildSeedData()): void {
    this.topics = seed.topics.map((topic) => ({ ...topic }));
    this.posts = seed.posts.map((post) => ({ ...post }));
    this.comments = seed.comments.map((comment) => ({ ...comment }));
    this.captureTasks = seed.captureTasks.map((task) => ({ ...task }));
    this.analysisRules = seed.analysisRules.map((rule) => ({ ...rule }));
    this.analysisTasks = [];
    this.analysisResults = [];
    this.reviewDecisions = [];
    this.reports = [];
    this.topicComments = new Map();
    this.topicPosts = new Map();
    this.seq = { cap: 100, ant: 100, res: 0, rev: 0, topic: 100, cmt: 100_000, post: 10_000, rep: 0 };
  }

  nextId(kind: keyof MockDatabase['seq'], prefix: string, width = 3): string {
    this.seq[kind] += 1;
    return `${prefix}_${String(this.seq[kind]).padStart(width, '0')}`;
  }

  getTopic(id: string): Topic | undefined {
    return this.topics.find((topic) => topic.id === id);
  }
  getPost(id: string): SocialPost | undefined {
    return this.posts.find((post) => post.id === id);
  }
  getComment(id: string): SocialComment | undefined {
    return this.comments.find((comment) => comment.id === id);
  }
  getCaptureTask(id: string): CaptureTask | undefined {
    return this.captureTasks.find((task) => task.id === id);
  }
  getAnalysisTask(id: string): AnalysisTask | undefined {
    return this.analysisTasks.find((task) => task.id === id);
  }

  addPosts(posts: Array<Omit<SocialPost, 'id'>>): SocialPost[] {
    return posts.map((post) => {
      const created: SocialPost = { ...post, id: this.nextId('post', 'post', 5) };
      this.posts.push(created);
      return created;
    });
  }

  addComments(comments: Array<Omit<SocialComment, 'id'>>): SocialComment[] {
    return comments.map((comment) => {
      const created: SocialComment = { ...comment, id: this.nextId('cmt', 'cmt', 5) };
      this.comments.push(created);
      return created;
    });
  }

  /** Latest decision per result id; pending when none exists. */
  currentReviewStatus(resultId: string): 'pending' | 'confirmed' | 'uncertain' | 'rejected' {
    const decisions = this.reviewDecisions.filter((decision) => decision.resultId === resultId);
    return decisions.length ? decisions[decisions.length - 1].status : 'pending';
  }

  addReviewDecision(resultId: string, status: ReviewDecision['status'], note?: string): ReviewDecision {
    const id = this.nextId('rev', 'rev', 4);
    const decision: ReviewDecision = { id, resultId, status, note, reviewedAt: new Date().toISOString() };
    this.reviewDecisions.push(decision);
    return decision;
  }

  linkTopicComments(topicId: string, commentIds: string[]): void {
    let set = this.topicComments.get(topicId);
    if (!set) {
      set = new Set();
      this.topicComments.set(topicId, set);
    }
    for (const commentId of commentIds) set.add(commentId);
    const postSet = this.topicPosts.get(topicId) ?? new Set<string>();
    for (const commentId of commentIds) {
      const comment = this.getComment(commentId);
      if (comment) postSet.add(comment.postId);
    }
    this.topicPosts.set(topicId, postSet);
  }

  topicCommentIds(topicId: string): string[] {
    const linked = this.topicComments.get(topicId) ?? new Set<string>();
    const seeded = this.posts
      .filter((post) => post.topicIds.includes(topicId))
      .flatMap((post) => this.comments.filter((comment) => comment.postId === post.id).map((comment) => comment.id));
    return [...new Set([...seeded, ...linked])];
  }
}

export const db = new MockDatabase();
export type { ApiPaginated, PaginatedResponse };
