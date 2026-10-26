# AGENTS.md — SystemOne V1

## 产品范围
以评论为优先研判对象，公开原帖提供上下文。V1 是单用户完整交互式 MSW Demo；不实现真实采集、真实 AI、登录/权限、后端或数据库。需求和验收以 docs/prd-v1.md、docs/acceptance.md 为准。

## 工程边界
- React 19 + TypeScript + Vite 7；Ant Design 6 + CSS Modules/Token；React Router Data Router；TanStack Query 5；Axios；MSW 2；Lucide；Ant Design Charts；Day.js；ExcelJS；Vitest。
- 顶部吸顶单行导航 + 分组下拉，移动端 Drawer，命令搜索 Ctrl/⌘+K；禁止侧边栏替代和页面标签栏。
- 配置集中 src/config；按 src/features/<feature> 模块开发；src/mocks 只提供内存模拟，刷新重置；列表状态置于 URL，不能复制到 Zustand。
- 公共组件已有实现应复用，禁止 Tailwind、第二套 UI 或图标库。
- API 统一 {items,total,page,pageSize} 与 {message,code?,details?}；错误边界、加载/空状态、危险操作二次确认，复核结论留痕。
- 研判结果必须包含规则版本、上下文证据、模型不确定性和人工复核记录，不得将评分表述为已核实事实或推断用户个人政治立场。

## 开发过程
任何新增功能先修订相关 SPEC/ADR/验收文档，再实施；通过 pnpm lint、pnpm typecheck、pnpm test、pnpm build。将未实现能力明确标为计划状态，不得展示死按钮或伪造真实处理结果。所有新 Issue 参照 docs/development-plan.md。

## 与来源模板的关系
此仓库已独立复制来源模板的通用基础能力，不保留旧客户/项目/订单/用户模块，也不建立 submodule、workspace 或跨仓库运行依赖。
