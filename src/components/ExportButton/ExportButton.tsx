import { useState } from 'react';
import { Button, Dropdown, type MenuProps } from 'antd';
import { Download } from 'lucide-react';
import type { ExportFormat } from '../../utils/export';
import { copy } from '../../config/copy';

export interface ExportButtonProps {
  onExport: (format: ExportFormat) => void | Promise<void>;
  disabled?: boolean;
  label?: string;
  size?: 'small' | 'middle' | 'large';
  /** Describes what the menu exports; selected rows are not the filtered result set. */
  scope?: 'filtered' | 'selected';
}

export function ExportButton({
  onExport,
  disabled,
  label = copy.export.label,
  size = 'middle',
  scope = 'filtered',
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const scopeLabel = scope === 'selected' ? copy.export.scopeSelected : copy.export.scopeFiltered;

  const handleClick: MenuProps['onClick'] = async ({ key }) => {
    setLoading(true);
    try {
      await onExport(key as ExportFormat);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: [
          { key: 'csv', label: copy.export.csv(scopeLabel) },
          { key: 'xlsx', label: copy.export.xlsx(scopeLabel) },
        ],
        onClick: handleClick,
      }}
    >
      <Button
        icon={<Download size={15} />}
        loading={loading}
        disabled={disabled}
        size={size}
        type="default"
      >
        {label}
      </Button>
    </Dropdown>
  );
}
