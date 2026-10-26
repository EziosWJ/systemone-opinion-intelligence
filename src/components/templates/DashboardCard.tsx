import type { ReactNode } from 'react';
import { Card, Skeleton } from 'antd';
import { EmptyState, ErrorState } from '../AsyncState/AsyncState';
import { copy } from '../../config/copy';
import styles from './DashboardCard.module.css';

export interface DashboardCardProps {
  title: ReactNode;
  extra?: ReactNode;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: boolean;
  emptyDescription?: ReactNode;
  height?: number;
  children: ReactNode;
}

export function DashboardCard({
  title,
  extra,
  loading,
  error,
  onRetry,
  empty,
  emptyDescription,
  height = 300,
  children,
}: DashboardCardProps) {
  return (
    <Card title={title} extra={extra} className={styles.card}>
      <div className={styles.body} style={{ minHeight: height }}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : empty ? (
          <EmptyState title={copy.async.emptyTitle} description={emptyDescription} />
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
