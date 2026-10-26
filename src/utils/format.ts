import dayjs from 'dayjs';

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('zh-CN');

export const EMPTY_TEXT = '—';

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY_TEXT;
  return currencyFormatter.format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY_TEXT;
  return numberFormatter.format(value);
}

/** Pure dates use YYYY-MM-DD and never undergo timezone conversion. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return EMPTY_TEXT;
  return value.slice(0, 10);
}

/** ISO timestamps are displayed in the viewer's local timezone. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return EMPTY_TEXT;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : value;
}

export function formatNullable(
  value: string | number | null | undefined,
  fallback: string = EMPTY_TEXT,
): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY_TEXT;
  return `${Math.round(value)}%`;
}

export function todayString(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function isDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
