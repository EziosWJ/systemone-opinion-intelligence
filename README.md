# SystemOne · 舆情智能研判平台

> **状态：V1 工程基础与需求设计阶段。** 当前仓库不代表具备真实微博采集或 AI 推理能力。

面向社交媒体公开内容的舆情研判演示工程，以微博评论为主要分析对象，结合原微博上下文，规划采集任务、AI 多维度评分、人工复核、专题分析与报告生成的完整业务闭环。

- 技术基线：React 19、TypeScript、Vite 7、Ant Design 6、React Router 7、TanStack Query 5、MSW 2。
- 交付目标：**完整交互式 Demo**；采集、评分与报告均由模拟数据驱动，后续可替换为正式接口。
- 模拟规模：4 个社会热点专题、300 条微博、约 10,000 条评论。
- 用户模式：单用户，**不包含登录或权限系统**。
- 风格：顶部业务模块分组导航、专业数据分析平台风格，保留浅色/深色主题。

## 开发阶段

此仓库先建立模板基础设施与正式需求基线，随后按 [开发计划](docs/development-plan.md) 实施 V1 功能。尚未实施的功能只在文档中定义，不应被理解为现有产品能力。

## 开始使用

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

需要 Node.js >= 22.12、pnpm >= 10。默认开发环境启用 MSW；生产预览若需 MSW，请设置 `VITE_ENABLE_MSW=true` 后构建。

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 文档

- [文档索引](docs/README.md)
- [V1 PRD](docs/prd-v1.md)
- [技术架构](docs/architecture.md)
- [业务数据模型](docs/domain-model.md)
- [Mock API 契约](docs/mock-api.md)
- [交互验收标准](docs/acceptance.md)
- [分阶段开发计划](docs/development-plan.md)
- [工程治理与迁移记录](docs/migration.md)

## 重要说明

演示数据为虚构/脱敏内容。AI 分数仅用于任务关联性、文本表达特征和人工复核优先级，不用于自动判定个人政治倾向或真实意图；输出需保留上下文证据与不确定性。实际采集应遵守数据来源平台条款、适用法律与隐私要求。

来源脚手架：[react-topnav-template](https://github.com/EziosWJ/react-topnav-template)，保留通用架构，移除原演示业务。
