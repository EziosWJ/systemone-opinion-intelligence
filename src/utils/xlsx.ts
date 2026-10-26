import type { ExportColumn } from './csv';

export async function buildXlsxBlob<T>(
  sheetName: string,
  columns: Array<ExportColumn<T>>,
  rows: T[],
): Promise<Blob> {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.header,
    width: column.width ?? 20,
    style: column.numberFormat ? { numFmt: column.numberFormat } : undefined,
  }));

  for (const row of rows) {
    const values: Record<string, unknown> = {};
    for (const column of columns) values[column.header] = column.value(row);
    sheet.addRow(values);
  }

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEDEBFF' },
  };
  sheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + Math.max(columns.length, 1))}1` };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
