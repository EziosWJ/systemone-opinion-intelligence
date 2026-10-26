export type StatusTone = 'success' | 'processing' | 'warning' | 'error' | 'default';
export interface StatusMeta { label: string; tone: StatusTone; }
export interface SelectOption<T extends string = string> { value: T; label: string; }
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
export type ReviewStatus = 'pending' | 'confirmed' | 'uncertain' | 'rejected';
export type ReportStatus = 'draft' | 'ready' | 'exported';
export const taskStatusMeta: Record<TaskStatus, StatusMeta> = {
  pending: { label: '待执行', tone: 'default' }, running: { label: '执行中', tone: 'processing' },
  completed: { label: '已完成', tone: 'success' }, failed: { label: '失败', tone: 'error' }, canceled: { label: '已取消', tone: 'warning' },
};
export const reviewStatusMeta: Record<ReviewStatus, StatusMeta> = {
  pending: { label: '待复核', tone: 'warning' }, confirmed: { label: '已确认', tone: 'success' },
  uncertain: { label: '存疑', tone: 'processing' }, rejected: { label: '已驳回', tone: 'default' },
};
export const reportStatusMeta: Record<ReportStatus, StatusMeta> = {
  draft: { label: '草稿', tone: 'default' }, ready: { label: '待导出', tone: 'processing' }, exported: { label: '已导出', tone: 'success' },
};
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 10;
export function getStatusMeta<T extends string>(meta: Record<T, StatusMeta>, value: T): StatusMeta {
  return meta[value] ?? { label: String(value), tone: 'default' };
}
