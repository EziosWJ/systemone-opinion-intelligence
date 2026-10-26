import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { Activity, Database, BrainCircuit, FolderKanban, FileText, Settings, ClipboardCheck, Search, ListChecks, BookOpen, type LucideIcon } from 'lucide-react';
import { matchPath } from 'react-router-dom';

export interface AppRouteDefinition {
  path: string;
  label: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  group?: string;
  component: LazyExoticComponent<ComponentType>;
  navigation?: boolean;
  parentPath?: string;
  searchable?: boolean;
  keywords?: string;
}
export interface NavGroup { key: string; label: string; icon: LucideIcon; items: AppRouteDefinition[]; }

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const CaptureTasksPage = lazy(() => import('../features/capture/pages/CaptureTasksPage'));
const PostsPage = lazy(() => import('../features/capture/pages/PostsPage'));
const CommentsPage = lazy(() => import('../features/capture/pages/CommentsPage'));
const AnalysisTasksPage = lazy(() => import('../features/analysis/pages/AnalysisTasksPage'));
const WorkbenchPage = lazy(() => import('../features/analysis/pages/WorkbenchPage'));
const ReviewsPage = lazy(() => import('../features/analysis/pages/ReviewsPage'));
const RulesPage = lazy(() => import('../features/analysis/pages/RulesPage'));
const TopicsPage = lazy(() => import('../features/topics/pages/TopicsPage'));
const TopicDetailPage = lazy(() => import('../features/topics/pages/TopicDetailPage'));
const ReportsPage = lazy(() => import('../features/reports/pages/ReportsPage'));
const ReportDetailPage = lazy(() => import('../features/reports/pages/ReportDetailPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
export const routeDefinitions: AppRouteDefinition[] = [
  { path: '/', label: '舆情总览', title: '舆情态势总览', description: '采集、研判与专题的综合态势入口。', icon: Activity, component: DashboardPage, navigation: true, searchable: true },
  { path: '/capture/tasks', label: '采集任务', title: '采集任务', description: '管理链接、关键词和导入采集任务。', icon: ListChecks, group: '数据采集', component: CaptureTasksPage, navigation: true, searchable: true },
  { path: '/capture/posts', label: '微博内容库', title: '微博内容库', description: '浏览已获取的公开微博及上下文。', icon: BookOpen, group: '数据采集', component: PostsPage, navigation: true, searchable: true },
  { path: '/capture/comments', label: '评论数据', title: '评论数据', description: '筛选评论和查看原帖关联。', icon: Database, group: '数据采集', component: CommentsPage, navigation: true, searchable: true },
  { path: '/analysis/tasks', label: 'AI 研判任务', title: 'AI 研判任务中心', description: '配置及执行自动/批量研判任务。', icon: BrainCircuit, group: 'AI 研判', component: AnalysisTasksPage, navigation: true, searchable: true },
  { path: '/analysis/workbench', label: '综合研判工作台', title: '综合研判工作台', description: '评分、标签、依据和上下文聚合查看。', icon: Search, group: 'AI 研判', component: WorkbenchPage, navigation: true, searchable: true },
  { path: '/analysis/reviews', label: '人工复核', title: '人工复核', description: '确认、存疑和驳回分析结果。', icon: ClipboardCheck, group: 'AI 研判', component: ReviewsPage, navigation: true, searchable: true },
  { path: '/analysis/rules', label: '研判规则', title: '研判规则', description: '规则模板、评分配置与版本。', icon: ListChecks, group: 'AI 研判', component: RulesPage, navigation: true, searchable: true },
  { path: '/topics', label: '专题列表', title: '专题分析', description: '创建专题并聚合评论与研判结果。', icon: FolderKanban, group: '专题分析', component: TopicsPage, navigation: true, searchable: true },
  { path: '/topics/:id', label: '专题详情', title: '专题详情', description: '专题趋势、观点与关联数据。', icon: FolderKanban, group: '专题分析', parentPath: '/topics', component: TopicDetailPage },
  { path: '/reports', label: '报告列表', title: '报告中心', description: '管理专题分析报告。', icon: FileText, group: '报告中心', component: ReportsPage, navigation: true, searchable: true },
  { path: '/reports/:id', label: '报告详情', title: '报告详情', description: '报告编辑、预览和导出。', icon: FileText, group: '报告中心', parentPath: '/reports', component: ReportDetailPage },
  { path: '/settings', label: '系统设置', title: '系统设置', description: '演示环境和未来模型连接参数。', icon: Settings, group: '系统设置', component: SettingsPage, navigation: true, searchable: true },
];
const groupIcons: Record<string, LucideIcon> = { '数据采集': Database, 'AI 研判': BrainCircuit, '专题分析': FolderKanban, '报告中心': FileText, '系统设置': Settings };
export function getNavigation(): { dashboard: AppRouteDefinition | undefined; groups: NavGroup[] } {
  const dashboard = routeDefinitions.find((route) => route.navigation && !route.group);
  const groupOrder: string[] = [];
  for (const route of routeDefinitions) if (route.navigation && route.group && !groupOrder.includes(route.group)) groupOrder.push(route.group);
  return { dashboard, groups: groupOrder.map((label) => ({ key: label, label, icon: groupIcons[label] ?? Activity, items: routeDefinitions.filter((route) => route.navigation && route.group === label) })) };
}

function patternScore(pattern: string): number {
  return pattern.split('/').filter(Boolean).length * 10 + (pattern.includes(':') ? 0 : 5);
}

/** Matches the most specific configured route for a browser pathname. */
export function matchRoute(pathname: string): AppRouteDefinition | undefined {
  return [...routeDefinitions]
    .filter((route) => matchPath({ path: route.path, end: true }, pathname))
    .sort((left, right) => patternScore(right.path) - patternScore(left.path))[0];
}

export function getNavigationRoute(pathname: string): AppRouteDefinition | undefined {
  let current = matchRoute(pathname);
  const visited = new Set<string>();
  while (current && !current.navigation && current.parentPath && !visited.has(current.path)) {
    visited.add(current.path);
    const parent = routeDefinitions.find((route) => route.path === current?.parentPath);
    current = parent;
  }
  return current?.navigation ? current : undefined;
}

/** Maps a configured parent pattern onto the live URL, e.g. /topics/:id -> /topics/topic_001. */
function actualPathFor(routePath: string, pathname: string): string {
  const length = routePath.split('/').filter(Boolean).length;
  const segments = pathname.split('/').filter(Boolean).slice(0, length);
  return '/' + segments.join('/');
}

export interface BreadcrumbEntry {
  key: string;
  title: string;
  path?: string;
}

/** Breadcrumb trail derived from the same centralized route table as navigation. */
export function getBreadcrumbTrail(pathname: string): BreadcrumbEntry[] {
  const current = matchRoute(pathname);
  if (!current) return [];
  const trail: AppRouteDefinition[] = [];
  const visited = new Set<string>();
  let cursor: AppRouteDefinition | undefined = current;
  while (cursor && !visited.has(cursor.path)) {
    visited.add(cursor.path);
    trail.unshift(cursor);
    cursor = cursor.parentPath
      ? routeDefinitions.find((route) => route.path === cursor?.parentPath)
      : undefined;
  }
  const entries: BreadcrumbEntry[] = [];
  if (pathname !== '/') {
    entries.push({ key: 'home', title: '舆情总览', path: '/' });
  }
  for (const route of trail) {
    entries.push({
      key: route.path,
      title: route.label,
      path: route.path === current.path ? undefined : actualPathFor(route.path, pathname),
    });
  }
  return entries;
}

export function getCommandItems(): Array<{
  key: string;
  label: string;
  title: string;
  group: string;
  path: string;
  icon?: LucideIcon;
  keywords?: string;
}> {
  return routeDefinitions
    .filter((route) => route.searchable)
    .map((route) => ({
      key: route.path,
      label: route.label,
      title: route.title,
      group: route.path.endsWith('/new') ? '快捷操作' : (route.group ?? '主导航'),
      path: route.path,
      icon: route.icon,
      keywords: route.keywords,
    }));
}
