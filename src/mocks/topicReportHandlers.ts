import { http, HttpResponse } from 'msw';
import { env } from '../config/env';
import { db } from './db/database';

const notFound = (message: string, code: string) => HttpResponse.json({ message, code }, { status: 404 });
const badRequest = (message: string, code: string) => HttpResponse.json({ message, code }, { status: 400 });

const SENTIMENT_LABEL: Record<string, string> = {
  positive: '正面', neutral: '中性', negative: '负面', mixed: '混合', unclear: '含混',
};

function topicInsights(topicId: string) {
  const commentIds = db.topicCommentIds(topicId);
  const comments = commentIds.map((id) => db.getComment(id)!).filter(Boolean);
  const analyzed = db.analysisResults.filter((r) => commentIds.includes(r.commentId));

  const dayCounts = new Map<string, number>();
  for (const comment of comments) {
    const day = comment.publishedAt.slice(0, 10);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }
  const trend = [...dayCounts.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, collected]) => ({ day, collected }));

  const sentimentCounts = new Map<string, number>();
  for (const result of analyzed) {
    sentimentCounts.set(result.sentiment, (sentimentCounts.get(result.sentiment) ?? 0) + 1);
  }

  const tagCounts = new Map<string, number>();
  for (const result of analyzed) {
    for (const tag of result.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  const representative = [...analyzed]
    .sort((a, b) => b.reviewPriority - a.reviewPriority || (a.id < b.id ? -1 : 1))
    .slice(0, 10)
    .map((result) => {
      const comment = db.getComment(result.commentId);
      const post = comment ? db.getPost(comment.postId) : undefined;
      return {
        commentId: result.commentId,
        text: comment?.text ?? '',
        publishedAt: comment?.publishedAt ?? '',
        postText: post?.text ?? '',
        relevance: result.relevance,
        ironyProbability: result.ironyProbability,
      };
    });

  return {
    topicId,
    totalComments: comments.length,
    analyzedComments: new Set(analyzed.map((r) => r.commentId)).size,
    pendingReviews: analyzed.filter((r) => {
      const status = db.currentReviewStatus(r.id);
      return status === 'pending' || status === 'uncertain';
    }).length,
    trend,
    sentimentDistribution: [...sentimentCounts.entries()].map(([sentiment, count]) => ({
      sentiment,
      label: SENTIMENT_LABEL[sentiment] ?? sentiment,
      count,
    })),
    tagDistribution: [...tagCounts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 12),
    representative,
  };
}

function generateReportMarkdown(topicId: string): { contentMarkdown: string; snapshot: Record<string, unknown> } {
  const topic = db.getTopic(topicId)!;
  const insights = topicInsights(topicId);
  const lines: string[] = [];
  lines.push(`# ${topic.title} 舆情专题简报`);
  lines.push('');
  lines.push(`> 生成时间：${new Date().toISOString()} · 数据来源：MSW 内存模拟数据 · 分析引擎：MockAnalysisEngine（模拟评分）`);
  lines.push('');
  lines.push('## 一、数据说明');
  lines.push(`- 本报告基于专题「${topic.title}」当前关联的 ${insights.totalComments} 条模拟评论（${insights.analyzedComments} 条已完成模拟研判）。`);
  lines.push('- 全部数据为演示用虚构内容，不代表真实舆论统计；模拟评分仅供人工复核参考。');
  lines.push('- 评分语义：话题相关性/反讽可能性/复核优先级为 0-100 指示性数值；置信度为 0-1 模拟自评。');
  lines.push('');
  lines.push('## 二、热度趋势');
  lines.push(`评论量按日分布（共 ${insights.trend.length} 个有数据的天）：`);
  const recent = insights.trend.slice(-7);
  for (const point of recent) lines.push(`- ${point.day}：${point.collected} 条`);
  lines.push('');
  lines.push('## 三、观点与情绪分布');
  if (insights.sentimentDistribution.length) {
    for (const item of insights.sentimentDistribution) {
      lines.push(`- ${item.label}：${item.count} 条`);
    }
  } else {
    lines.push('- 尚无研判数据，请先创建并推进分析任务。');
  }
  if (insights.tagDistribution.length) {
    lines.push('');
    lines.push('主要标签：');
    for (const item of insights.tagDistribution.slice(0, 6)) lines.push(`- ${item.tag}（${item.count}）`);
  }
  lines.push('');
  lines.push('## 四、典型评论与来源');
  if (insights.representative.length) {
    for (const item of insights.representative.slice(0, 5)) {
      lines.push(`> ${item.text}`);
      lines.push(`> —— 评论 ${item.commentId} · ${item.publishedAt.slice(0, 10)} · 相关性 ${item.relevance} · 反讽可能性 ${item.ironyProbability}`);
      if (item.postText) lines.push(`> 原帖：${item.postText.slice(0, 60)}…`);
      lines.push('');
    }
  } else {
    lines.push('暂无代表性评论。');
  }
  lines.push('## 五、模型推断与人工复核');
  lines.push(`- 待复核（含存疑）：${insights.pendingReviews} 条。`);
  lines.push('- 上表评分为模拟引擎输出，含反讽判断的条目均已标注依据与置信度，需人工复核确认。');
  lines.push('- 本报告不推断任何发言者的私人政治立场、可信度或真实意图。');
  lines.push('');
  lines.push('## 六、不确定性与待核查事项');
  lines.push('- 反讽/隐喻判断仅有文本依据，缺少账号与传播上下文，结论置信度有限。');
  lines.push('- 部分“语义含混”条目需结合原帖与发布时间人工核查。');
  lines.push('- 模拟数据刷新后会重置；导出的报告代表生成时刻的快照。');

  return {
    contentMarkdown: lines.join('\n'),
    snapshot: {
      topicId,
      totalComments: insights.totalComments,
      analyzedComments: insights.analyzedComments,
      generatedAt: new Date().toISOString(),
      ruleVersions: [...new Set(db.analysisResults.map((r) => `${r.ruleId}@v${r.ruleVersion}`))],
      resultIds: db.analysisResults.filter((r) => commentIdsOf(topicId).includes(r.commentId)).map((r) => r.id),
    },
  };
}

function commentIdsOf(topicId: string): string[] {
  return db.topicCommentIds(topicId);
}

export const topicReportHandlers = [
  http.patch(`${env.apiBaseUrl}/topics/:id`, async ({ request, params }) => {
    const topic = db.getTopic(String(params.id));
    if (!topic) return notFound('专题不存在', 'TOPIC_NOT_FOUND');
    const body = (await request.json().catch(() => ({}))) as { title?: string; summary?: string; keywords?: string[] };
    if (body.title !== undefined && !body.title.trim()) return badRequest('标题不能为空', 'TITLE_REQUIRED');
    if (body.title) topic.title = body.title.trim();
    if (body.summary !== undefined) topic.summary = body.summary;
    if (body.keywords) topic.keywords = [...new Set(body.keywords.map((k) => k.trim()).filter(Boolean))];
    topic.updatedAt = new Date().toISOString();
    return HttpResponse.json(topic);
  }),

  http.post(`${env.apiBaseUrl}/topics/:id/comments`, async ({ request, params }) => {
    const topic = db.getTopic(String(params.id));
    if (!topic) return notFound('专题不存在', 'TOPIC_NOT_FOUND');
    const body = (await request.json().catch(() => ({}))) as { commentIds?: string[] };
    const ids = body.commentIds ?? [];
    if (!ids.length) return badRequest('commentIds 不能为空', 'IDS_REQUIRED');
    const missing = ids.filter((id) => !db.getComment(id));
    if (missing.length) return badRequest(`以下评论不存在：${missing.slice(0, 3).join(', ')}`, 'COMMENT_NOT_FOUND');
    db.linkTopicComments(topic.id, ids);
    return HttpResponse.json({ topicId: topic.id, linked: ids.length }, { status: 201 });
  }),

  http.get(`${env.apiBaseUrl}/topics/:id/insights`, ({ params }) => {
    const topicId = String(params.id);
    if (!db.getTopic(topicId)) return notFound('专题不存在', 'TOPIC_NOT_FOUND');
    return HttpResponse.json(topicInsights(topicId));
  }),

  http.get(`${env.apiBaseUrl}/reports`, ({ request }) => {
    const url = new URL(request.url);
    const topicId = url.searchParams.get('topicId') ?? undefined;
    const rows = db.reports.filter((report) => !topicId || report.topicId === topicId);
    return HttpResponse.json({ items: rows, total: rows.length, page: 1, pageSize: 50 });
  }),

  http.post(`${env.apiBaseUrl}/reports`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { topicId?: string };
    if (!body.topicId || !db.getTopic(body.topicId)) return badRequest('专题不存在', 'TOPIC_NOT_FOUND');
    const { contentMarkdown, snapshot } = generateReportMarkdown(body.topicId);
    const report = {
      id: db.nextId('rep', 'rep', 3),
      topicId: body.topicId,
      title: `${db.getTopic(body.topicId)!.title} 舆情专题简报`,
      status: 'draft' as const,
      contentMarkdown,
      snapshot: JSON.stringify(snapshot),
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.reports.push(report);
    return HttpResponse.json({ ...report, snapshot }, { status: 201 });
  }),

  http.get(`${env.apiBaseUrl}/reports/:id`, ({ params }) => {
    const report = db.reports.find((r) => r.id === String(params.id));
    if (!report) return notFound('报告不存在', 'REPORT_NOT_FOUND');
    return HttpResponse.json({ ...report, snapshot: JSON.parse(report.snapshot) });
  }),

  http.patch(`${env.apiBaseUrl}/reports/:id`, async ({ request, params }) => {
    const report = db.reports.find((r) => r.id === String(params.id));
    if (!report) return notFound('报告不存在', 'REPORT_NOT_FOUND');
    const body = (await request.json().catch(() => ({}))) as { contentMarkdown?: string; title?: string; status?: 'draft' | 'ready' | 'exported' };
    if (body.contentMarkdown !== undefined) report.contentMarkdown = body.contentMarkdown;
    if (body.title) report.title = body.title;
    if (body.status) report.status = body.status;
    report.updatedAt = new Date().toISOString();
    return HttpResponse.json({ ...report, snapshot: JSON.parse(report.snapshot) });
  }),

  http.get(`${env.apiBaseUrl}/reports/:id/export`, ({ params, request }) => {
    const report = db.reports.find((r) => r.id === String(params.id));
    if (!report) return notFound('报告不存在', 'REPORT_NOT_FOUND');
    const format = new URL(request.url).searchParams.get('format') ?? 'html';
    if (format !== 'html') return badRequest('暂仅支持 HTML 导出', 'UNSUPPORTED_FORMAT');
    report.status = 'exported';
    report.updatedAt = new Date().toISOString();
    const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${report.title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.7;color:#1f2937}h1{font-size:24px}blockquote{border-left:3px solid #2563eb;margin:8px 0;padding:4px 12px;color:#4b5563;background:#f5f7ff}</style>
</head><body>
<article id="content">
${report.contentMarkdown
  .split('\n')
  .map((line) => {
    if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
    if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
    if (line.startsWith('> ')) return `<blockquote>${line.slice(2)}</blockquote>`;
    if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`;
    if (!line.trim()) return '';
    return `<p>${line}</p>`;
  })
  .join('\n')}
</article>
<footer><hr><p style="color:#9ca3af;font-size:12px">SystemOne V1 演示报告 · 模拟数据生成 · 导出时间 ${report.updatedAt}</p></footer>
</body></html>`;
    return new HttpResponse(html, {
      headers: {
        'Content-Type': 'text/html;charset=utf-8',
        'Content-Disposition': `attachment; filename="${report.id}.html"`,
      },
    });
  }),

  http.get(`${env.apiBaseUrl}/exports/analysis`, async ({ request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') ?? 'csv';
    const reviewStatus = url.searchParams.get('reviewStatus') ?? undefined;
    let rows = db.analysisResults;
    if (reviewStatus) rows = rows.filter((r) => db.currentReviewStatus(r.id) === reviewStatus);
    const header = '结果ID,评论ID,规则,版本,相关性,反讽可能性,情绪,复核优先级,标签,置信度,复核状态';
    const lines = rows.map((r) =>
      [r.id, r.commentId, r.ruleId, r.ruleVersion, r.relevance, r.ironyProbability, r.sentiment, r.reviewPriority, r.tags.join('|'), r.confidence, db.currentReviewStatus(r.id)].join(','),
    );
    if (format === 'xlsx') {
      return new HttpResponse('﻿' + [header, ...lines].join('\n'), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="analysis-export.xlsx"`,
        },
      });
    }
    return new HttpResponse('﻿' + [header, ...lines].join('\n'), {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="analysis-export.csv"`,
      },
    });
  }),
];
