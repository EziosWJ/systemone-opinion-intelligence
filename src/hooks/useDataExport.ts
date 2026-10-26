import { useCallback } from 'react';
import { App } from 'antd';
import { getErrorMessage } from '../lib/api/errors';
import { copy } from '../config/copy';
import { exportRows, type ExportColumn, type ExportFormat } from '../utils/export';

export interface DataExportOptions<T> {
  moduleName: string;
  sheetName: string;
  columns: Array<ExportColumn<T>>;
  /** Business-provided fetcher for every row matching current filters. */
  getRows: () => Promise<T[]>;
}

export function useDataExport<T>({ moduleName, sheetName, columns, getRows }: DataExportOptions<T>) {
  const { message } = App.useApp();

  const exportRowsOf = useCallback(
    async (rows: T[], format: ExportFormat) => {
      if (rows.length === 0) {
        message.warning(copy.common.noExportData);
        return;
      }
      try {
        await exportRows({ moduleName, sheetName, columns, rows, format });
        message.success(copy.common.exported(rows.length));
      } catch (error) {
        message.error(copy.common.exportFailed(getErrorMessage(error)));
      }
    },
    [columns, message, moduleName, sheetName],
  );

  const exportFiltered = useCallback(
    async (format: ExportFormat) => {
      try {
        const rows = await getRows();
        await exportRowsOf(rows, format);
      } catch (error) {
        message.error(copy.common.exportFailed(getErrorMessage(error)));
      }
    },
    [exportRowsOf, getRows, message],
  );

  return { exportFiltered, exportRowsOf };
}
