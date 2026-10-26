export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
  width?: number;
  numberFormat?: string;
}

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  // Excel treats cells beginning with these characters as formulas. Prefix
  // untrusted strings with a quote so opening the CSV cannot execute them.
  const raw = String(value);
  const text = typeof value === 'string' && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (/[",\r\n]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

export function toCsv<T>(columns: Array<ExportColumn<T>>, rows: T[]): string {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(',');
  const body = rows.map((row) => columns.map((column) => escapeCsvCell(column.value(row))).join(','));
  return [header, ...body].join('\r\n');
}

/** The UTF-8 BOM keeps Chinese text readable when opened directly in Excel. */
export function buildCsvBlob<T>(columns: Array<ExportColumn<T>>, rows: T[]): Blob {
  return new Blob(['﻿' + toCsv(columns, rows)], { type: 'text/csv;charset=utf-8;' });
}
