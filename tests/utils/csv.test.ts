import { describe, expect, it } from 'vitest';
import { buildCsvBlob, escapeCsvCell, toCsv, type ExportColumn } from '../../src/utils/csv';
import { buildXlsxBlob } from '../../src/utils/xlsx';

interface Row {
  name: string;
  amount: number;
  note: string;
}

const columns: Array<ExportColumn<Row>> = [
  { header: '客户名称', value: (row) => row.name, width: 24 },
  { header: '金额', value: (row) => row.amount, numberFormat: '#,##0.00' },
  { header: '备注', value: (row) => row.note },
];

function readBlobBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

const rows: Row[] = [
  { name: '星海,科技', amount: 1234.5, note: '他说"你好"\n第二行' },
  { name: '云杉数据', amount: 88, note: '' },
];

describe('CSV export', () => {
  it('escapes commas, quotes and newlines', () => {
    expect(escapeCsvCell('plain')).toBe('plain');
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
    expect(escapeCsvCell('a\nb')).toBe('"a\nb"');
    expect(escapeCsvCell(null)).toBe('');
  });

  it('neutralises spreadsheet formulas in string cells', () => {
    expect(escapeCsvCell('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)");
    expect(escapeCsvCell('+1')).toBe("'+1");
    expect(escapeCsvCell('@cmd')).toBe("'@cmd");
    expect(escapeCsvCell(-10)).toBe('-10');
  });

  it('writes headers and rows with CRLF', () => {
    const csv = toCsv(columns, rows);
    expect(csv.split('\r\n')[0]).toBe('客户名称,金额,备注');
    expect(csv).toContain('"星海,科技",1234.5');
    expect(csv).toContain('云杉数据,88,');
  });

  it('adds a UTF-8 BOM so Excel opens Chinese text correctly', async () => {
    const blob = buildCsvBlob(columns, rows);
    const bytes = new Uint8Array(await readBlobBuffer(blob));
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('客户名称');
  });
});

describe('XLSX export', () => {
  it('produces a readable workbook with headers, rows and numeric formats', async () => {
    const blob = await buildXlsxBlob('客户', columns, rows);
    expect(blob.size).toBeGreaterThan(0);

    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    await workbook.xlsx.load(await readBlobBuffer(blob));
    const sheet = workbook.getWorksheet('客户');
    expect(sheet).toBeDefined();
    expect(sheet?.getRow(1).getCell(1).value).toBe('客户名称');
    expect(sheet?.getRow(2).getCell(1).value).toBe('星海,科技');
    expect(sheet?.getRow(2).getCell(2).value).toBe(1234.5);
    expect(sheet?.getRow(1).font?.bold).toBe(true);
  });
});
