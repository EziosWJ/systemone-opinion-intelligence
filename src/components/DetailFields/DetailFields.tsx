import type { ReactNode } from 'react';
import { Card, Descriptions } from 'antd';
import styles from './DetailFields.module.css';

export interface DetailFieldItem {
  key: string;
  label: ReactNode;
  children: ReactNode;
  span?: number;
}

export function DetailFields({ items, column = 2 }: { items: DetailFieldItem[]; column?: number }) {
  return (
    <Descriptions
      bordered
      size="middle"
      column={{ xs: 1, sm: 1, md: column, xl: column }}
      items={items.map((item) => ({
        key: item.key,
        label: item.label,
        children: item.children,
        span: item.span,
      }))}
    />
  );
}

export function DetailSection({
  title,
  extra,
  children,
  className,
}: {
  title: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={[styles.section, className].filter(Boolean).join(' ')}
      title={title}
      extra={extra}
    >
      {children}
    </Card>
  );
}
