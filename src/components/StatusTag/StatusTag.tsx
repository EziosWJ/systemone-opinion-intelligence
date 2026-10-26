import {
  customerStatusMeta,
  getStatusMeta,
  orderStatusMeta,
  projectStatusMeta,
  userStatusMeta,
  type StatusMeta,
  type StatusTone,
} from '../../config/options';
import type { CustomerStatus, OrderStatus, ProjectStatus, UserStatus } from '../../types/entities';
import styles from './StatusTag.module.css';

export type StatusKind = 'customer' | 'project' | 'order' | 'user';

const metaByKind: Record<StatusKind, Record<string, StatusMeta>> = {
  customer: customerStatusMeta,
  project: projectStatusMeta,
  order: orderStatusMeta,
  user: userStatusMeta,
};

interface StatusTagProps {
  kind: StatusKind;
  value: CustomerStatus | ProjectStatus | OrderStatus | UserStatus | string;
}

/** Tone palette: dot colour plus a soft tinted background for each theme. */
const toneTokens: Record<StatusTone, { color: string; bg: string; darkBg: string }> = {
  success: { color: '#16a34a', bg: '#eaf7ef', darkBg: 'rgb(22 163 74 / 16%)' },
  processing: { color: '#635bdb', bg: '#eeecfd', darkBg: 'rgb(99 91 219 / 20%)' },
  warning: { color: '#d98a1f', bg: '#fdf3e3', darkBg: 'rgb(217 138 31 / 18%)' },
  error: { color: '#d95c5c', bg: '#fdecec', darkBg: 'rgb(217 92 92 / 18%)' },
  default: { color: '#6b7280', bg: '#f0f1f5', darkBg: 'rgb(107 114 128 / 18%)' },
};

export function StatusTag({ kind, value }: StatusTagProps) {
  const meta = getStatusMeta(metaByKind[kind], value);
  const tone = toneTokens[meta.tone];

  return (
    <span
      className={`${styles.statusTag} status-tag`}
      data-status={value}
      data-tone={meta.tone}
      style={
        {
          '--status-color': tone.color,
          '--status-bg': tone.bg,
          '--status-bg-dark': tone.darkBg,
        } as React.CSSProperties
      }
    >
      <span className={styles.dot} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
