# 迁移与仓库治理记录

- 源：`EziosWJ/react-topnav-template`，公共仓库 `main`。
- 目标：`EziosWJ/systemone-opinion-intelligence`。
- 迁移分支：`chore/bootstrap-v1-foundation`。
- 日期：2026-10-26。

## 保留

React/Vite/TypeScript/pnpm 技术栈、Ant Design 6、CSS Modules、Theme Token、顶部导航布局、移动 Drawer、全局命令搜索、React Router Data Router、TanStack Query、Axios、MSW browser/server、ExcelJS、CSV 导出、测试工具，以及通用公共组件：DataTable、AsyncState、PageHeader、SearchFilterBar、CommandPalette、FormDrawer、FormPage、DetailFields、StatusTag、MockUpload、ExportButton 和页面模板。

## 移除

旧源仓库 `src/features/customers|projects|orders|users`、旧业务详情/表单/列表页、`src/mocks/data.ts` 与旧业务 handlers、旧业务测试、原模板的经营指标与业务文案。未迁移旧业务规范文档，全部采用本项目新的 PRD/领域/API/验收规范。

## 替换

- 配置品牌 SystemOne、蓝色主色、首页产品阶段说明。
- 集中路由转换为五个业务分组 + 首页；未实现功能路由明确展示“计划中”，无假结果。
- 新领域数据 TypeScript 类型与任务/复核状态字典、Query Keys。
- MSW 基础元信息 handler（`GET /api/meta`），后续业务端点在 docs/mock-api.md 中定义。
- 保留既有通用组件与单元测试，替换不再适用的业务规范和测试设置。

## 当前与目标边界

**当前提交不是完整 Demo**：已有工程容器与需求/接口设计；具体采集/分析/报告 API 与 UI 需按 Issues 开发。仓库元数据（GitHub About/Topics/Visibility）由仓库管理员在 Settings 中维护，Git 文件更新不自动改变 GitHub 仓库 About 配置。

建议 GitHub Description：
`SystemOne — AI-powered public opinion intelligence demo platform for social media analysis`

建议 Topics：
`react`, `typescript`, `antd`, `social-listening`, `sentiment-analysis`, `mock-service-worker`。
