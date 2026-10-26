# Mock API 契约 — SystemOne V1

**状态**：计划规范。当前已实现的最小路由只有 `GET /api/meta`。下列业务端点需随 GitHub Issues 分阶段实现，不能将其称作已提供的接口。

Base URL：`VITE_API_BASE_URL=/api`；JSON 请求与响应（文件导入单独处理）；时间点统一 ISO 8601 UTC/含时区。

## 1. 全局约定

分页查询 `page=1&pageSize=10&keyword=&sortBy=&sortOrder=asc|desc`，可选业务筛选 `status/topicId/postId/ruleId/from/to`；分页响应：

```json
{
  "items": [{"id": "cmt_001", "postId": "post_001", "text": "示例评论"}],
  "total": 10000,
  "page": 1,
  "pageSize": 10
}
```

单实体直接返回实体 JSON；新建返回 `201` + 实体；删除成功 `204`；异步模拟任务采用 `202` + 任务快照（不伪造真实后台任务）。错误：

```json
{ "message": "目标评论不存在", "code": "COMMENT_NOT_FOUND", "details": { "id": "cmt_missing" } }
```

状态码：400 参数格式、404 不存在、409 状态冲突、422 业务校验、500 注入服务端故障。列表合法 pageSize 为 10/20/50/100；非法值回退有文档默认或返回明确 400，不发生前端无提示截断。

## 2. Endpoint 清单

| Method | Path | 作用 / 重要参数 |
| --- | --- | --- |
| GET | `/meta` | **已实现**。返回当前 mock mode/phase |
| GET | `/dashboard/summary?range=7d` | KPI、趋势、话题排名、状态分布 |
| GET / POST | `/capture/tasks` | 任务查询 / 创建（mode, input, filter） |
| GET | `/capture/tasks/:id` | 状态、进度、失败原因 |
| POST | `/capture/tasks/:id/advance` | **演示专用**可控进度推进，无真实外部调用 |
| GET | `/posts` | 公开模拟微博列表、按 topicId 等查询 |
| GET | `/posts/:id` | 原微博详情与上下文 |
| GET | `/comments` | 评论列表，按 postId/topicId/时间/关键词筛选 |
| GET | `/comments/:id` | 评论及关联原帖摘要 |
| GET / POST | `/analysis/rules` | 规则模板列表 / 新建版本 |
| GET | `/analysis/rules/:id` | 规则当前版本或查询 version |
| GET / POST | `/analysis/tasks` | AI 任务列表 / 新建任务（ruleId, commentIds/filter） |
| GET | `/analysis/tasks/:id` | 执行状态、进度、结果数 |
| POST | `/analysis/tasks/:id/advance` | 演示专用显式推进并生成确定性结果 |
| GET | `/analysis/results` | 多维评分结果分页与筛选 |
| GET | `/analysis/results/:id` | 评分 + 依据 + 帖子上下文 |
| GET | `/reviews?status=pending` | 当前待复核队列 |
| POST | `/analysis/results/:id/reviews` | 新增复核记录；body: status, note |
| GET | `/analysis/results/:id/reviews` | 该结果的历史复核记录 |
| GET / POST | `/topics` | 专题列表 / 新建 |
| GET / PATCH | `/topics/:id` | 专题详情 / 更新元数据 |
| POST | `/topics/:id/comments` | 关联评论 ID 列表，去重 |
| GET | `/topics/:id/insights` | 按专题统计趋势、观点分布与代表来源 |
| GET / POST | `/reports` | 报告查询 / 创建生成任务 |
| GET / PATCH | `/reports/:id` | 当前正文、统计快照与编辑 |
| GET | `/reports/:id/export?format=html` | 从当前保存正文生成可下载文件 |
| GET | `/exports/analysis?format=csv|xlsx` | 研判列表按过滤条件导出全量 |

## 3. 典型请求与响应

### 3.1 创建采集任务

```http
POST /api/capture/tasks
Content-Type: application/json

{"mode":"keyword","input":"虚构城市公共交通调整","topicId":"topic_001"}
```

```json
{
  "id":"cap_001","mode":"keyword","input":"虚构城市公共交通调整",
  "status":"pending","total":120,"processed":0,
  "createdAt":"2026-10-26T08:00:00Z","updatedAt":"2026-10-26T08:00:00Z"
}
```

### 3.2 创建 AI 任务

```http
POST /api/analysis/tasks
Content-Type: application/json

{"ruleId":"rule_semantics","ruleVersion":1,"commentIds":["cmt_001","cmt_002"]}
```

返回 `202` 的 `AnalysisTask`，任务进度由后台模拟处理器状态决定。重复请求若有幂等键不重复生成；不能请求不存在的评论 ID。

### 3.3 返回单条 AI 分析

```json
{
  "id":"result_001","commentId":"cmt_001","analysisTaskId":"ant_001",
  "ruleId":"rule_semantics","ruleVersion":1,
  "relevance":89,"ironyProbability":72,
  "sentiment":"mixed","reviewPriority":82,
  "confidence":0.63,
  "tags":["反讽表达可能","公共服务讨论"],
  "evidence":["原文中出现夸张赞许","原帖上下文包含政策疑问"],
  "explanation":"可能存在反讽；仅根据文本及上下文辅助判断，尚需人工复核。",
  "createdAt":"2026-10-26T08:01:00Z"
}
```

### 3.4 提交复核

```http
POST /api/analysis/results/result_001/reviews
Content-Type: application/json

{"status":"uncertain","note":"原帖上下文不足，暂保留疑问"}
```

返回 `201` 的追加式 `ReviewDecision`；随后相关 `/dashboard/summary` / `/reviews` 查询反映最新统计。

## 4. 数据一致性与错误模拟

- Seed：固定 4 专题 / 300 帖 / 10k 评论，确定性 ID；所有 handlers 读取/写入同一个内存 DB，不从组件中另造数据。
- 批量筛选先于排序、排序先于分页；同排序键再以稳定 ID 决定顺序。
- 主动失败测试：`__demoFailure=network|server|empty` 等开发专用开关，只在 mock 模式启用，并在测试显式声明。
- 创建采集/分析任务并推进后，评论/结果/专题/仪表盘的 ID、数量与最新状态必须一致。
- `advance` 只用于可控演示；不在正式后端契约中暴露给最终用户。
- Handler 与端点的实现状态以自动化测试和实际源码为准；文档不代表已上线。
