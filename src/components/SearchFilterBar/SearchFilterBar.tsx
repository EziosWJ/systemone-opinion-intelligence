import type { FormEvent, ReactNode } from 'react';
import { Button, Input, Space } from 'antd';
import { RotateCcw, Search } from 'lucide-react';
import { copy } from '../../config/copy';
import styles from './SearchFilterBar.module.css';

export interface SearchFilterBarProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  placeholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  resultSummary?: ReactNode;
  resetDisabled?: boolean;
  loading?: boolean;
  searchLabel?: string;
}

export function SearchFilterBar({
  keyword,
  onKeywordChange,
  onSearch,
  onReset,
  placeholder = copy.search.placeholder,
  filters,
  actions,
  resultSummary,
  resetDisabled,
  loading,
  searchLabel = copy.common.search,
}: SearchFilterBarProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch();
  };

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} role="search" onSubmit={handleSubmit}>
        <div className={styles.controls}>
          <Input
            allowClear
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            prefix={<Search size={16} aria-hidden="true" />}
            className={styles.keyword}
          />
          {filters && <div className={styles.filters}>{filters}</div>}
          <Space size={8} className={styles.buttons}>
            <Button type="primary" htmlType="submit" loading={loading}>
              {searchLabel}
            </Button>
            <Button icon={<RotateCcw size={15} />} onClick={onReset} disabled={resetDisabled}>
              {copy.common.reset}
            </Button>
          </Space>
        </div>
        {actions && (
          <>
            <div className={styles.divider} aria-hidden="true" />
            <div className={styles.actions}>{actions}</div>
          </>
        )}
      </form>
      {resultSummary && (
        <div className={styles.summary} aria-live="polite">
          {resultSummary}
        </div>
      )}
    </div>
  );
}
