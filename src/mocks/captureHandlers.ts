import { http, HttpResponse } from 'msw';
import { env } from '../config/env';
import { db } from './db/database';
import { createRng, pick, randInt } from './utils/rng';
import { TOPIC_SEEDS } from './data/seed';
import type { CaptureTask } from '../types/entities';

interface CaptureTaskRecord extends CaptureTask {
  topicId?: string;
}

const badRequest = (message: string, code: string) => HttpResponse.json({ message, code }, { status: 400 });
const notFound = (message: string, code: string) => HttpResponse.json({ message, code }, { status: 404 });

interface CaptureCreateBody {
  mode?: 'url' | 'keyword' | 'import';
  input?: string;
  topicId?: string;
  items?: Array<{ text: string; comments?: string[] }>;
}

const KEYWORD_POST_TEXTS = [
  '围绕{kw}的讨论还在继续，今天实地探访发现标识已经更新，人流分流也比之前明确。',
  '{kw}上了同城热搜，热评前几条都在讨论实际体验与宣传的差距，附现场图。',
  '整理了近期关于{kw}的官方回复口径，汇总成时间线供大家参考，欢迎补充。',
  '邻居问{kw}后续安排，把社区公告的内容转述一下：下周起分阶段实施，保留人工通道。',
  '作为亲历者说说{kw}：整体方向没问题，细节执行还要打磨，特别是通知触达。',
];

const KEYWORD_COMMENT_TEXTS = [
  '看了现场，确实比想象中有序，赞一个。' , '宣传和实际体验还是有落差，希望改进。', '转发让更多人看到，理性讨论。',
  '这种调整早该做了，支持！', '等细则，先观望。', '数据挺好看，就怕口径不清。', '老人使用还是不便，保留人工窗口吧。',
];

/**
 * Demo-only task progress driver. Each `advance` call moves a pending/running
 * task forward by a deterministic chunk, creating real posts/comments in the
 * DB as it goes so downstream modules see consistent data.
 */
export function advanceCaptureTask(inputTask: CaptureTask): CaptureTask {
  const task = inputTask as CaptureTaskRecord;
  if (task.status === 'completed' || task.status === 'failed' || task.status === 'canceled') return task;
  const chunk = Math.max(1, Math.ceil(task.total / 4));
  const target = Math.min(task.total, task.processed + chunk);
  const seedFrom = task.id;
  const rng = createRng(hashString(seedFrom) + task.processed);

  const newPosts: Array<{ platform: 'weibo'; sourceId: string; url: string; text: string; publishedAt: string; topicIds: string[] }> = [];
  const newComments: Array<{ postId: string; sourceId: string; text: string; publishedAt: string; collectedAt: string }> = [];
  const now = new Date().toISOString();

  while (task.processed < target) {
    task.processed += 1;
    const postIndex = db.posts.length + newPosts.length + 1;
    const text = task.mode === 'url' ? urlPostText(task.input) : pick(rng, KEYWORD_POST_TEXTS).replaceAll('{kw}', task.input);
    const post = {
      platform: 'weibo' as const,
      sourceId: `wb_${500000 + postIndex}`,
      url: task.mode === 'url' && /^https?:\/\//.test(task.input) ? task.input : `https://m.weibo.demo/status/${500000 + postIndex}`,
      text,
      publishedAt: now,
      topicIds: task.topicId ? [task.topicId] : [],
    };
    const created = db.addPosts([post])[0];
    newPosts.push(post);
    const commentCount = randInt(rng, 3, 6);
    for (let c = 0; c < commentCount; c += 1) {
      newComments.push({
        postId: created.id,
        sourceId: `wc_${800000 + db.comments.length + newComments.length + 1}`,
        text: pick(rng, KEYWORD_COMMENT_TEXTS),
        publishedAt: now,
        collectedAt: now,
      });
    }
  }
  db.addComments(newComments);
  task.updatedAt = now;
  if (task.processed >= task.total) task.status = 'completed';
  else task.status = 'running';
  return task;
}

function urlPostText(input: string): string {
  return `【链接采集】采集自 ${input.slice(0, 60)} 的公开微博：发布方就近期热点发布说明，评论区展开讨论。`;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

interface CaptureTaskWithTopicId extends CaptureTask {
  topicId?: string;
}

export const captureHandlers = [
  http.get(`${env.apiBaseUrl}/capture/tasks`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? undefined;
    const mode = url.searchParams.get('mode') ?? undefined;
    const keyword = (url.searchParams.get('keyword') ?? '').trim().toLowerCase();
    let rows = db.captureTasks as CaptureTaskWithTopicId[];
    if (status) rows = rows.filter((task) => task.status === status);
    if (mode) rows = rows.filter((task) => task.mode === mode);
    if (keyword) rows = rows.filter((task) => task.input.toLowerCase().includes(keyword) || task.id.includes(keyword));
    rows = [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 10);
    const start = (page - 1) * pageSize;
    return HttpResponse.json({ items: rows.slice(start, start + pageSize), total: rows.length, page, pageSize });
  }),

  http.post(`${env.apiBaseUrl}/capture/tasks`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as CaptureCreateBody;
    if (!body.mode || !['url', 'keyword', 'import'].includes(body.mode)) {
      return badRequest('采集模式必须为 url / keyword / import', 'INVALID_MODE');
    }
    if (body.mode === 'url') {
      if (!body.input || !/^https?:\/\/.+\..+/.test(body.input.trim())) {
        return badRequest('URL 模式需要合法的微博链接（https://…）', 'INVALID_URL');
      }
    } else if (body.mode === 'keyword') {
      if (!body.input?.trim() || body.input.trim().length < 2) {
        return badRequest('关键词模式需要至少 2 个字符的关键词', 'INVALID_KEYWORD');
      }
    } else if (!Array.isArray(body.items) || body.items.length === 0) {
      return badRequest('导入模式需要包含至少一条数据记录', 'INVALID_IMPORT');
    }
    if (body.topicId && !db.getTopic(body.topicId)) {
      return badRequest('关联专题不存在', 'TOPIC_NOT_FOUND');
    }
    const total =
      body.mode === 'import' ? Math.max(body.items!.length, 1) * 4 : body.mode === 'url' ? 6 : 12;
    const task: CaptureTaskWithTopicId = {
      id: db.nextId('cap', 'cap', 3),
      mode: body.mode,
      input: body.mode === 'import' ? `文件导入（${body.items!.length} 条）` : body.input!.trim(),
      status: 'pending',
      total,
      processed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      topicId: body.topicId,
    };
    db.captureTasks.push(task);
    return HttpResponse.json(task, { status: 201 });
  }),

  http.get(`${env.apiBaseUrl}/capture/tasks/:id`, ({ params }) => {
    const task = db.getCaptureTask(String(params.id));
    if (!task) return notFound('采集任务不存在', 'CAPTURE_TASK_NOT_FOUND');
    const posts = db.posts.filter((post) => post.sourceId.startsWith('wb_5'));
    return HttpResponse.json({ ...task, producedPosts: posts.length });
  }),

  http.post(`${env.apiBaseUrl}/capture/tasks/:id/advance`, ({ params }) => {
    const task = db.getCaptureTask(String(params.id));
    if (!task) return notFound('采集任务不存在', 'CAPTURE_TASK_NOT_FOUND');
    if (task.status === 'completed') return HttpResponse.json(task);
    // Deterministic simulated failure for a fixed demo input.
    if (task.input.includes('失败演示')) {
      task.status = 'failed';
      task.error = '模拟采集失败：目标页面不可达（演示专用错误）';
      task.updatedAt = new Date().toISOString();
      return HttpResponse.json(task);
    }
    return HttpResponse.json(advanceCaptureTask(task));
  }),

  http.post(`${env.apiBaseUrl}/capture/tasks/:id/cancel`, ({ params }) => {
    const task = db.getCaptureTask(String(params.id));
    if (!task) return notFound('采集任务不存在', 'CAPTURE_TASK_NOT_FOUND');
    if (task.status === 'completed' || task.status === 'failed') {
      return HttpResponse.json({ message: '终态任务不能取消', code: 'TASK_TERMINAL' }, { status: 409 });
    }
    task.status = 'canceled';
    task.updatedAt = new Date().toISOString();
    return HttpResponse.json(task);
  }),
];

export { TOPIC_SEEDS };
