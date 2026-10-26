import type { ExportColumn } from './csv';
import { buildCsvBlob } from './csv';
import { buildXlsxBlob } from './xlsx';
import { downloadBlob } from './download';
import dayjs from 'dayjs';

export type ExportFormat = 'csv' | 'xlsx';

export interface ExportOptions<T> {
  moduleName: string;
  sheetName: string;
  columns: Array<ExportColumn<T>>;
  rows: T[];
  format: ExportFormat;
}

export function exportFileName(moduleName: string, format: ExportFormat): string {
  return `${moduleName}-${dayjs().format('YYYY-MM-DD')}.${format}`;
}

export async function exportRows<T>(options: ExportOptions<T>): Promise<void> {
  const { moduleName, sheetName, columns, rows, format } = options;
  const filename = exportFileName(moduleName, format);
  if (format === 'csv') {
    downloadBlob(buildCsvBlob(columns, rows), filename);
    return;
  }
  const blob = await buildXlsxBlob(sheetName, columns, rows);
  downloadBlob(blob, filename);
}

export type { ExportColumn };
