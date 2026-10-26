import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import {
  BriefcaseBusiness,
  ClipboardList,
  LayoutDashboard,
  UserRoundCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { matchPath } from 'react-router-dom';

export interface AppRouteDefinition {
  /** Route pattern, e.g. /customers/:id. */
  path: string;
  /** Short label used by navigation and breadcrumbs. */
  label: string;
  /** Page/document title. */
  title: string;
  description: string;
  icon?: LucideIcon;
  group?: string;
  component: LazyExoticComponent<ComponentType>;
  /** Top-level navigation entry. */
  navigation?: boolean;
  /** Detail/edit routes are reachable but not shown in navigation. */
  parentPath?: string;
  searchable?: boolean;
  keywords?: string;
}

export interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: AppRouteDefinition[];
}

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const CustomerListPage = lazy(() => import('../pages/customers/CustomerListPage'));
const CustomerDetailPage = lazy(() => import('../pages/customers/CustomerDetailPage'));
const CustomerFormPage = lazy(() => import('../pages/customers/CustomerFormPage'));
const ProjectListPage = lazy(() => import('../pages/projects/ProjectListPage'));
const ProjectDetailPage = lazy(() => import('../pages/projects/ProjectDetailPage'));
const ProjectFormPage = lazy(() => import('../pages/projects/ProjectFormPage'));
const OrderListPage = lazy(() => import('../pages/orders/OrderListPage'));
const OrderDetailPage = lazy(() => import('../pages/orders/OrderDetailPage'));
const OrderFormPage = lazy(() => import('../pages/orders/OrderFormPage'));
const UserListPage = lazy(() => import('../pages/users/UserListPage'));
const UserDetailPage = lazy(() => import('../pages/users/UserDetailPage'));
const UserFormPage = lazy(() => import('../pages/users/UserFormPage'));

export const routeDefinitions: AppRouteDefinition[] = [
  {
    path: '/',
    label: '仪表盘',
    title: '经营总览',
    description: '客户、项目、订单与用户的关键经营指标。',
    icon: LayoutDashboard,
    component: DashboardPage,
    navigation: true,
    searchable: true,
    keywords: 'dashboard 首页 概览 指标',
  },
  {
    path: '/customers',
    label: '客户管理',
    title: '客户管理',
    description: '维护客户资料、状态与关联项目及订单。',
    icon: Users,
    group: '业务管理',
    component: CustomerListPage,
    navigation: true,
    searchable: true,
    keywords: 'customer 客户 企业',
  },
  {
    path: '/customers/new',
    label: '新建客户',
    title: '新建客户',
    description: '创建新的客户档案。',
    icon: Users,
    group: '业务管理',
    parentPath: '/customers',
    component: CustomerFormPage,
    searchable: true,
    keywords: '新建 客户 create',
  },
  {
    path: '/customers/:id',
    label: '客户详情',
    title: '客户详情',
    description: '查看客户资料及关联业务。',
    icon: Users,
    group: '业务管理',
    parentPath: '/customers',
    component: CustomerDetailPage,
  },
  {
    path: '/customers/:id/edit',
    label: '编辑客户',
    title: '编辑客户',
    description: '更新客户资料。',
    icon: Users,
    group: '业务管理',
    parentPath: '/customers/:id',
    component: CustomerFormPage,
  },
  {
    path: '/projects',
    label: '项目管理',
    title: '项目管理',
    description: '跟踪项目进度、预算与负责人。',
    icon: BriefcaseBusiness,
    group: '业务管理',
    component: ProjectListPage,
    navigation: true,
    searchable: true,
    keywords: 'project 项目 进度',
  },
  {
    path: '/projects/new',
    label: '新建项目',
    title: '新建项目',
    description: '创建新的项目并关联客户。',
    icon: BriefcaseBusiness,
    group: '业务管理',
    parentPath: '/projects',
    component: ProjectFormPage,
    searchable: true,
    keywords: '新建 项目 create',
  },
  {
    path: '/projects/:id',
    label: '项目详情',
    title: '项目详情',
    description: '查看项目进度、预算与关联客户。',
    icon: BriefcaseBusiness,
    group: '业务管理',
    parentPath: '/projects',
    component: ProjectDetailPage,
  },
  {
    path: '/projects/:id/edit',
    label: '编辑项目',
    title: '编辑项目',
    description: '更新项目信息与进度。',
    icon: BriefcaseBusiness,
    group: '业务管理',
    parentPath: '/projects/:id',
    component: ProjectFormPage,
  },
  {
    path: '/orders',
    label: '订单管理',
    title: '订单管理',
    description: '管理订单金额、状态与客户关联。',
    icon: ClipboardList,
    group: '业务管理',
    component: OrderListPage,
    navigation: true,
    searchable: true,
    keywords: 'order 订单 金额',
  },
  {
    path: '/orders/new',
    label: '新建订单',
    title: '新建订单',
    description: '创建新的订单。',
    icon: ClipboardList,
    group: '业务管理',
    parentPath: '/orders',
    component: OrderFormPage,
    searchable: true,
    keywords: '新建 订单 create',
  },
  {
    path: '/orders/:id',
    label: '订单详情',
    title: '订单详情',
    description: '查看订单金额、状态及关联业务。',
    icon: ClipboardList,
    group: '业务管理',
    parentPath: '/orders',
    component: OrderDetailPage,
  },
  {
    path: '/orders/:id/edit',
    label: '编辑订单',
    title: '编辑订单',
    description: '更新订单信息。',
    icon: ClipboardList,
    group: '业务管理',
    parentPath: '/orders/:id',
    component: OrderFormPage,
  },
  {
    path: '/users',
    label: '用户管理',
    title: '用户管理',
    description: '维护业务用户资料、部门与状态。',
    icon: UserRoundCog,
    group: '系统管理',
    component: UserListPage,
    navigation: true,
    searchable: true,
    keywords: 'user 用户 成员 部门',
  },
  {
    path: '/users/new',
    label: '新建用户',
    title: '新建用户',
    description: '创建新的业务用户资料。',
    icon: UserRoundCog,
    group: '系统管理',
    parentPath: '/users',
    component: UserFormPage,
    searchable: true,
    keywords: '新建 用户 create',
  },
  {
    path: '/users/:id',
    label: '用户详情',
    title: '用户详情',
    description: '查看业务用户资料。',
    icon: UserRoundCog,
    group: '系统管理',
    parentPath: '/users',
    component: UserDetailPage,
  },
  {
    path: '/users/:id/edit',
    label: '编辑用户',
    title: '编辑用户',
    description: '更新业务用户资料。',
    icon: UserRoundCog,
    group: '系统管理',
    parentPath: '/users/:id',
    component: UserFormPage,
  },
];

const groupIcons: Record<string, LucideIcon> = {
  业务管理: BriefcaseBusiness,
  系统管理: UserRoundCog,
};

/** Top navigation: dashboard plus one dropdown per group, in declaration order. */
export function getNavigation(): { dashboard: AppRouteDefinition | undefined; groups: NavGroup[] } {
  const dashboard = routeDefinitions.find((route) => route.navigation && !route.group);
  const groupOrder: string[] = [];
  for (const route of routeDefinitions) {
    if (route.navigation && route.group && !groupOrder.includes(route.group)) groupOrder.push(route.group);
  }
  const groups = groupOrder.map((label) => ({
    key: label,
    label,
    icon: groupIcons[label] ?? BriefcaseBusiness,
    items: routeDefinitions.filter((route) => route.navigation && route.group === label),
  }));
  return { dashboard, groups };
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

/** Maps a configured parent pattern onto the live URL, e.g. /customers/:id -> /customers/cus_01. */
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
    entries.push({ key: 'home', title: '仪表盘', path: '/' });
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
