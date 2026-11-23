import type { Writable } from 'stream';
import type { ReportDefinition } from '../types';
import { sanitizeFormulaInjection } from '../helpers';

export interface CsvExportOptions {
  report: ReportDefinition;
  stream: AsyncIterable<Record<string, unknown>[]>;
  output: Writable;
}

export async function exportReportToCsv(options: CsvExportOptions): Promise<{ rowCount: number }> {
  const { report, stream, output } = options;

  // UTF-8 BOM so Excel opens UTF-8 encoded text properly
  output.write('\uFEFF');

  // Header row
  const headers = report.columns.map((c) => `"${c.label.replace(/"/g, '""')}"`);
  output.write(headers.join(',') + '\r\n');

  let rowCount = 0;

  for await (const chunk of stream) {
    for (const row of chunk) {
      rowCount++;
      const line = report.columns.map((col) => {
        const rawVal = row[col.key];
        if (rawVal === null || rawVal === undefined) return '""';

        let strVal: string;
        if (rawVal instanceof Date) {
          strVal = rawVal.toISOString();
        } else if (typeof rawVal === 'object') {
          strVal = JSON.stringify(rawVal);
        } else {
          strVal = String(rawVal);
        }

        // Escape CSV formula injection
        strVal = sanitizeFormulaInjection(strVal);

        return `"${strVal.replace(/"/g, '""')}"`;
      });

      output.write(line.join(',') + '\r\n');
    }
  }

  output.end();

  return { rowCount };
}
