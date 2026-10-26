import type { ReactNode } from 'react';
import { Card } from 'antd';
import { PageHeader, type PageHeaderProps } from '../PageHeader/PageHeader';
import styles from './ListPageTemplate.module.css';

export interface ListPageTemplateProps {
  header: PageHeaderProps;
  filterBar: ReactNode;
  children: ReactNode;
}

/** Standard list page: header, submitted filters, then the data table. */
export function ListPageTemplate({ header, filterBar, children }: ListPageTemplateProps) {
  return (
    <div className={styles.page}>
      <PageHeader {...header} />
      <Card className={styles.card}>
        <div className={styles.filter}>{filterBar}</div>
        {children}
      </Card>
    </div>
  );
}
