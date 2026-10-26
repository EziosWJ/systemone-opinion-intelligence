import type { CustomerStatus, OrderStatus, ProjectStatus, UserStatus } from '../types/entities';

export type StatusTone = 'success' | 'processing' | 'warning' | 'error' | 'default';

export interface StatusMeta {
  label: string;
  tone: StatusTone;
}

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export const customerStatusMeta: Record<CustomerStatus, StatusMeta> = {
  active: { label: '合作中', tone: 'success' },
  prospect: { label: '潜在客户', tone: 'processing' },
  inactive: { label: '已停用', tone: 'default' },
};

export const projectStatusMeta: Record<ProjectStatus, StatusMeta> = {
  planning: { label: '规划中', tone: 'default' },
  in_progress: { label: '进行中', tone: 'processing' },
  on_hold: { label: '已暂停', tone: 'warning' },
  completed: { label: '已完成', tone: 'success' },
  canceled: { label: '已取消', tone: 'error' },
};

export const orderStatusMeta: Record<OrderStatus, StatusMeta> = {
  draft: { label: '草稿', tone: 'default' },
  pending: { label: '待处理', tone: 'warning' },
  paid: { label: '已支付', tone: 'processing' },
  completed: { label: '已完成', tone: 'success' },
  canceled: { label: '已取消', tone: 'error' },
};

export const userStatusMeta: Record<UserStatus, StatusMeta> = {
  active: { label: '启用', tone: 'success' },
  disabled: { label: '停用', tone: 'default' },
};

function toOptions<T extends string>(meta: Record<T, StatusMeta>): Array<SelectOption<T>> {
  return (Object.keys(meta) as T[]).map((value) => ({ value, label: meta[value].label }));
}

export const customerStatusOptions = toOptions(customerStatusMeta);
export const projectStatusOptions = toOptions(projectStatusMeta);
export const orderStatusOptions = toOptions(orderStatusMeta);
export const userStatusOptions = toOptions(userStatusMeta);

export const industryOptions: SelectOption[] = [
  '制造业',
  '信息技术',
  '金融',
  '零售',
  '医疗健康',
  '教育',
  '物流',
  '能源',
  '其他',
].map((value) => ({ value, label: value }));

export const departmentOptions: SelectOption[] = [
  '产品研发',
  '销售',
  '市场',
  '客户成功',
  '财务',
  '人力资源',
  '运营',
].map((value) => ({ value, label: value }));

export const roleOptions: SelectOption[] = [
  '产品经理',
  '研发工程师',
  '销售经理',
  '客户成功经理',
  '财务专员',
  '人力资源专员',
  '运营专员',
].map((value) => ({ value, label: value }));

export const projectOwnerOptions: SelectOption[] = [
  '张伟',
  '李娜',
  '王强',
  '刘洋',
  '陈静',
  '赵敏',
].map((value) => ({ value, label: value }));

export const dashboardRangeOptions: Array<SelectOption<'30d' | '90d' | '12m'>> = [
  { value: '30d', label: '近 30 天' },
  { value: '90d', label: '近 90 天' },
  { value: '12m', label: '近 12 个月' },
];

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const DEFAULT_PAGE_SIZE = 10;

export function getStatusMeta<T extends string>(
  meta: Record<T, StatusMeta>,
  value: T,
): StatusMeta {
  return meta[value] ?? { label: String(value), tone: 'default' };
}
