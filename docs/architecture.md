# 技术架构 — SystemOne V1

## 1. 技术栈（复用模板，不升级版本）

| 层 | 实现 |
| --- | --- |
| 构建与语言 | Vite 7、React 19、TypeScript 5.9、pnpm 10 |
| UI | Ant Design 6 + CSS Modules + Design Token |
| 路由/菜单 | React Router 7，`src/config/routes.tsx` 集中维护 |
| 服务端状态 | TanStack Query 5，按领域 Query Keys |
| HTTP | Axios；基地址 `VITE_API_BASE_URL`；统一错误规范化 |
| Mock | MSW 2 browser/server；内存 Seed + handlers |
| 可视化 | @ant-design/charts；日期 Day.js |
| 状态/导出 | 局部 hooks / 按需 Zustand；CSV + ExcelJS |
| 测试 | Vitest + React Testing Library + ESLint |

## 2. 分层示意

```text
AppProviders(theme, QueryClient)
└─ AppRouter (createBrowserRouter + lazy)
   └─ AppLayout (topnav / grouped menu / command search / theme)
      ├─ pages/                  页面路由编排与交互
      ├─ features/<domain>/      API, query hooks, components, validation
      ├─ components/             通用表格、搜索、抽屉、上传、导出、状态
      └─ lib/api/                Axios、错误处理、分页工具
                               ↓
                          /api/* (HTTP)
                               ↓
                          MSW handlers
                               ↓
                       in-memory seeded DB
```

**当前实现状态**：通用基础代码已迁入；新的业务路由目前使用 Foundation 占位视图；`/api/meta` 为基础健康/阶段元信息接口。下述业务处理器及真实 Demo 种子数据均是开发规范，不能视作已实现。

## 3. 推荐目录

```text
src/
  app/                 Router / Providers
  config/              app.config / routes / env / copy / options
  layouts/             AppLayout
  pages/               Dashboard / Module / 后续具体业务页
  components/          共用 UI 组件（保留模板能力）
  features/
    capture/           采集任务与公开帖子/评论
    analysis/          规则、研判任务和结果
    reviews/           人工复核操作
    topics/            专题聚合与趋势
    reports/           报告生成、编辑和导出
    dashboard/         聚合与下钻
  lib/api/             axios/client/error
  lib/query/           keys 与失效
  hooks/               URL 搜索及其他 hooks
  mocks/               data/handlers/seed/server/browser
  types/               领域实体与 API
  utils/               format, export, csv, xlsx
tests/                  镜像业务分层
docs/                   PRD/架构/Mock API/验收/计划
```

## 4. 数据流与状态所有权

- 列表已提交查询条件、页码、排序和分页必须位于 URL。提交条件后由 Query hooks 统一请求，刷新/浏览器前进后可恢复。
- 业务实体与聚合统计的唯一来源为 MSW 内存态 DB。页面不得维护另一份可变业务实体副本。
- 变更动作（新建任务/研判/复核/专题/报告）通过 POST/PATCH 更新 MSW DB。成功后按关联领域失效 TanStack Query 缓存；失败时不预先显示成功。
- 采集任务进度在 MSW 内存态用明确的推进策略实现，结果记录与任务处理数同步更新。测试采用可控时钟/显式推进接口，避免依赖真实网络计时造成不稳定。
- UI 主题存储 localStorage 是模板原有行为；业务数据不做持久化，刷新回到固定 Seed。

## 5. Mock 数据生成与性能

- 固定随机种子生成 **4 个专题、300 条帖子、约 10k 条评论**，各 ID 唯一、外键有效、时间有序，能独立复现；不要存储 10k 行手写 JSON。
- MSW 查询执行服务端式分页、过滤、排序；默认 pageSize 10/20/50/100。避免把 10k 条评论直接渲染 DOM。
- 聚合指标按同一 DB 快照计算，Dashboard 趋势和列表过滤口径一致。大量跨分页导出使用分页遍历/生成数据流，并对最大数据量给出反馈。
- Mock 延迟与失败注入必须可控；默认不使用随机失败，所有异步状态可测试。

## 6. 未来 AI/JEV 接入的适配缝

定义与 UI 解耦的 `AnalysisEngine` 契约，例如：

```ts
interface AnalysisEngine {
  analyze(input: {
    commentId: string;
    text: string;
    postContext: string;
    ruleId: string;
    ruleVersion: number;
  }): Promise<AnalysisResult>;
}
```

V1 `MockAnalysisEngine` 从固定规则/种子生成可复现结构化结果；未来 `JevAnalysisEngine` 单独实现契约，不改变页面模型。必须校验返回 schema、限制 prompt/PII 暴露，保留证据和版本。

## 7. 质量、安全与工程约束

- 所有时间点存带时区的 ISO 8601；纯日期 YYYY-MM-DD；展示使用用户本地时间。
- API 错误 `{message,code?,details?}`；400/404/409 不自动重试；服务端查询可有限重试；写操作不自动重试。
- 模拟数据不代表真实舆论统计，不建立针对现实人物的政治属性标签、政治倾向风险榜单或个人画像。
- 禁止添加 Tailwind、第二套组件库、独立侧边栏、页面标签栏、跨模板共享运行依赖。
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全部通过才可声称工程完成。
