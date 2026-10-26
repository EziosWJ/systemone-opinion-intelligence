import { createRng, isoTimestampWithinDays, padId, pick, randInt, REFERENCE_NOW_ISO } from '../utils/rng';
import type {
  AnalysisRule,
  AnalysisResult,
  AnalysisTask,
  CaptureTask,
  ReviewDecision,
  SocialComment,
  SocialPost,
  Topic,
} from '../../types/entities';

/**
 * Deterministic seed dataset: 4 topics, 300 posts, ~10,000 comments.
 * All IDs are stable and all foreign keys are valid by construction.
 * Comment distribution per topic seeds the aggregate APIs later.
 */

export const SEED_TOPICS = 4;
export const SEED_POSTS = 300;
export const SEED_COMMENTS = 10_000;

export const TOPIC_SEEDS: Array<{ title: string; summary: string; keywords: string[] }> = [
  {
    title: '虚构城市公共交通票价调整',
    summary: '围绕虚构城市地铁与公交票价调整方案的公开讨论，聚焦通勤成本与服务质量的平衡。',
    keywords: ['公交票价', '地铁调价', '通勤成本', '公共交通'],
  },
  {
    title: '新型智慧社区服务平台试点',
    summary: '虚构城市智慧社区平台上线试点期间的居民反馈，涉及报修流程、物业响应与数据隐私边界。',
    keywords: ['智慧社区', '物业报修', '社区服务', '平台试点'],
  },
  {
    title: '本地农产品直供市集活动',
    summary: '周末农产品直供市集的公众讨论，包括价格、品质、农户收益与活动组织体验。',
    keywords: ['农产品市集', '直供', '农户收益', '周末市集'],
  },
  {
    title: '城市滨水绿道开放共享',
    summary: '滨水绿道分段开放后的市民体验反馈，覆盖跑步骑行安全、设施维护与共享规则争议。',
    keywords: ['滨水绿道', '骑行安全', '公共设施', '开放共享'],
  },
];

const POST_TEMPLATES: string[] = [
  '【通知】{topic}相关意见征集本周截止，市民可通过官方渠道提交建议，相关部门表示将公开回复采纳情况。',
  '今天体验了一把{topic}的新安排，整体流程比上个月顺畅一些，但高峰时段依然排队较久，大家感受如何？',
  '关于{topic}，整理了三天的实地观察：服务窗口增加了，指示标识还不够清楚，老年使用者反馈两极分化明显。',
  '转发提醒：{topic}的官方说明已发布，附常见问题解答。评论区说说你们的实际体验，理性讨论。',
  '就{topic}提个建议：能否开放线上预约分流？现场排队的大多数其实只需要简单咨询，白白等了一小时。',
  '邻居群里聊{topic}聊了一整晚。支持方担心涨价，反对方强调服务质量，其实核心诉求都是透明公示成本。',
  '{topic}试行两周小结：正面反馈集中在效率提升，负面反馈集中在通知不到位。中间派大多在观望细则。',
  '媒体视角看{topic}：这类公共事务讨论的关键在于信息对称。目前官方数据披露节奏偏慢，舆情热度自然降不下来。',
  '带家里老人体验了{topic}相关服务，工作人员很耐心，但自助设备对不熟悉智能手机的人还是太不友好。',
  '社区公告栏贴出了{topic}的实施细则，拍了照片发出来给大家参考。有疑问的可以打上面的咨询电话。',
  '作为从业者补充一些{topic}的背景信息：预算约束和人力配置才是落地差异的主因，光看表面参数容易误判。',
  '{topic}的话题阅读量又上去了。梳理热评发现，讨论焦点从情绪宣泄慢慢转向具体条款，这是好现象。',
];

const COMMENT_TEMPLATES: Array<{ text: string; sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'; tag: string }> = [
  { text: '支持这个方案，上周去现场看过，确实比以前方便多了。', sentiment: 'positive', tag: '支持' },
  { text: '排队时间还是太长，说是优化了，实际感受不明显。', sentiment: 'negative', tag: '体验不满' },
  { text: '楼上说的有道理，不过高峰期本来人就多，也要看对比基线。', sentiment: 'mixed', tag: '讨论' },
  { text: '费用涨了服务质量没跟上，希望公布成本明细。', sentiment: 'negative', tag: '成本质疑' },
  { text: '这波操作真“棒”，又方便了我们排队两小时。', sentiment: 'negative', tag: '反讽疑似' },
  { text: '官方说明终于出来了，比之前的小道消息靠谱。', sentiment: 'positive', tag: '信息透明' },
  { text: '家里的老人表示不会用线上预约，希望能保留人工窗口。', sentiment: 'neutral', tag: '适老关注' },
  { text: '说得真好听，落到我们小区一点变化都没有。', sentiment: 'negative', tag: '反讽疑似' },
  { text: '参加过意见征集，至少这次流程是公开的，值得肯定。', sentiment: 'positive', tag: '流程认可' },
  { text: '坐等后续细则，先不评价。', sentiment: 'neutral', tag: '观望' },
  { text: '数据倒是挺漂亮，就是不知道统计口径是什么。', sentiment: 'mixed', tag: '数据质疑' },
  { text: '点赞，现场引导人员态度很好，体验加分。', sentiment: 'positive', tag: '服务好评' },
  { text: '价格不是关键，关键是别一边涨价一边缩服务。', sentiment: 'mixed', tag: '权衡讨论' },
  { text: '呵呵，真是为老百姓“着想”啊。', sentiment: 'negative', tag: '反讽疑似' },
  { text: '媒体报道链接里有完整方案，建议大家看完再评论。', sentiment: 'neutral', tag: '理性引导' },
  { text: '昨晚高峰体验了一把，人流疏导比上个月有序多了。', sentiment: 'positive', tag: '体验改善' },
  { text: '这种事雷声大雨点小，见多了。', sentiment: 'negative', tag: '预期悲观' },
  { text: '楼上几位别急，试点期数据本来就波动大，等稳定期再看。', sentiment: 'mixed', tag: '讨论' },
  { text: '希望把投诉渠道也公示一下，出了问题找不到人负责。', sentiment: 'negative', tag: '责任诉求' },
  { text: '参加完听证会，感觉意见确实被记录了，后续看落实。', sentiment: 'positive', tag: '参与肯定' },
];

export interface SeedData {
  topics: Topic[];
  posts: SocialPost[];
  comments: SocialComment[];
  captureTasks: CaptureTask[];
  analysisRules: AnalysisRule[];
  analysisTasks: AnalysisTask[];
  analysisResults: AnalysisResult[];
  reviewDecisions: ReviewDecision[];
  /** comments per topic id, for balanced generation downstream. */
  commentCountByTopic: Record<string, number>;
  /** comments per post id. */
  commentCountByPost: Record<string, number>;
}

export function buildSeedData(): SeedData {
  const rng = createRng(20261026);
  const createdAt = '2026-10-12T09:00:00.000Z';

  const topics: Topic[] = TOPIC_SEEDS.map((topic, index) => ({
    id: padId('topic', index + 1, 3),
    title: topic.title,
    summary: topic.summary,
    keywords: [...new Set(topic.keywords)],
    createdAt,
    updatedAt: createdAt,
  }));

  const posts: SocialPost[] = [];
  let postSeq = 0;
  for (let t = 0; t < topics.length; t += 1) {
    const topic = topics[t];
    const postCount = Math.floor(SEED_POSTS / topics.length) + (t === 0 ? SEED_POSTS % topics.length : 0);
    for (let p = 0; p < postCount; p += 1) {
      postSeq += 1;
      const id = padId('post', postSeq);
      const text = pick(rng, POST_TEMPLATES).replaceAll('{topic}', topic.title.split('虚构城市')[1] ?? topic.title);
      posts.push({
        id,
        platform: 'weibo',
        sourceId: `wb_${410000 + postSeq}`,
        url: `https://m.weibo.demo/status/${410000 + postSeq}`,
        text,
        publishedAt: isoTimestampWithinDays(1, 20, postSeq * 977 + t * 311),
        topicIds: [topic.id],
      });
    }
  }

  const comments: SocialComment[] = [];
  let commentSeq = 0;
  const commentCountByPost: Record<string, number> = {};
  for (const post of posts) {
    // ~33 comments per post average → 300 * 33 = 9900; top up to 10k.
    const jitter = randInt(rng, -8, 8);
    const count = Math.max(0, 33 + jitter);
    for (let c = 0; c < count; c += 1) {
      commentSeq += 1;
      const template = pick(rng, COMMENT_TEMPLATES);
      comments.push({
        id: padId('cmt', commentSeq, 5),
        postId: post.id,
        sourceId: `wc_${900000 + commentSeq}`,
        text: template.text,
        publishedAt: isoTimestampWithinDays(0, 19, commentSeq * 617),
        collectedAt: isoTimestampWithinDays(0, 2, commentSeq * 31),
      });
    }
    commentCountByPost[post.id] = count;
  }
  // Top up to exactly SEED_COMMENTS deterministically by cloning from the front.
  while (comments.length < SEED_COMMENTS) {
    commentSeq += 1;
    const source = comments[commentSeq % 97];
    comments.push({
      id: padId('cmt', commentSeq, 5),
      postId: source.postId,
      sourceId: `wc_${900000 + commentSeq}`,
      text: source.text,
      publishedAt: isoTimestampWithinDays(0, 19, commentSeq * 617),
      collectedAt: isoTimestampWithinDays(0, 2, commentSeq * 31),
    });
    commentCountByPost[source.postId] += 1;
  }

  const commentCountByTopic: Record<string, number> = {};
  for (const post of posts) {
    for (const topicId of post.topicIds) {
      commentCountByTopic[topicId] = (commentCountByTopic[topicId] ?? 0) + commentCountByPost[post.id];
    }
  }

  // Seed capture tasks that "produced" the initial posts.
  const captureTasks: CaptureTask[] = topics.map((topic, index) => ({
    id: padId('cap', index + 1, 3),
    mode: 'keyword',
    input: topic.keywords[0],
    status: 'completed',
    total: posts.filter((post) => post.topicIds.includes(topic.id)).length,
    processed: posts.filter((post) => post.topicIds.includes(topic.id)).length,
    createdAt: isoTimestampWithinDays(20, 21, index * 431),
    updatedAt: isoTimestampWithinDays(19, 20, index * 431 + 97),
  }));

  const analysisRules: AnalysisRule[] = [
    {
      id: 'rule_semantics',
      name: '评论语义多维护判规则',
      version: 1,
      dimensions: ['relevance', 'irony', 'sentiment', 'reviewPriority'],
      promptTemplate: '基于规则模板 v1 评估评论与专题相关性、反讽表达可能性、情绪与复核优先级（模拟评分）。',
      outputSchemaVersion: 'v1',
    },
    {
      id: 'rule_priority',
      name: '高优先级筛选规则',
      version: 1,
      dimensions: ['relevance', 'reviewPriority'],
      promptTemplate: '基于规则模板 v1 聚焦相关性与复核优先级，用于批量预筛（模拟评分）。',
      outputSchemaVersion: 'v1',
    },
  ];

  return {
    topics,
    posts,
    comments,
    captureTasks,
    analysisRules,
    analysisTasks: [],
    analysisResults: [],
    reviewDecisions: [],
    commentCountByTopic,
    commentCountByPost,
  };
}

export const SEED_NOW = REFERENCE_NOW_ISO;
