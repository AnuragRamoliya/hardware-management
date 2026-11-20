import type { Writable } from 'stream';
import PDFDocument from 'pdfkit';
import type { ReportDefinition, ReportSummaryItem } from '../types';

export interface PdfExportOptions {
  report: ReportDefinition;
  stream: AsyncIterable<Record<string, unknown>[]>;
  output: Writable;
  summary?: ReportSummaryItem[];
  generatedBy?: string;
  maxPdfRows?: number;
}

export async function exportReportToPdf(options: PdfExportOptions): Promise<{ rowCount: number }> {
  const {
    report,
    stream,
    output,
    summary = [],
    generatedBy = 'System',
    maxPdfRows = 2500,
  } = options;

  return new Promise((resolve, reject) => {
    (async () => {
      try {
        const doc = new PDFDocument({
          layout: 'landscape',
          size: 'A4',
          margin: 30,
          bufferPages: true,
        });

        doc.pipe(output);

        // Header Banner
        doc.rect(30, 30, doc.page.width - 60, 40).fill('#0F172A');
        doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold');
        doc.text(report.title.toUpperCase(), 45, 42, { align: 'left' });

        doc.fillColor('#94A3B8').fontSize(9).font('Helvetica');
        const genText = `Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC | By: ${generatedBy}`;
        doc.text(genText, 45, 45, { align: 'right', width: doc.page.width - 90 });

        let currentY = 80;

        // Summary KPI strip
        if (summary.length > 0) {
          const kpiWidth = (doc.page.width - 60) / Math.min(summary.length, 4);
          summary.slice(0, 4).forEach((kpi, idx) => {
            const kpiX = 30 + idx * kpiWidth;
            doc.rect(kpiX, currentY, kpiWidth - 6, 32).fillAndStroke('#F1F5F9', '#CBD5E1');
            doc.fillColor('#64748B').fontSize(7).font('Helvetica');
            doc.text(kpi.label.toUpperCase(), kpiX + 6, currentY + 5, { width: kpiWidth - 12 });
            doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold');
            doc.text(String(kpi.value), kpiX + 6, currentY + 16, { width: kpiWidth - 12 });
          });
          currentY += 42;
        }

        // Column widths calculation
        const availWidth = doc.page.width - 60;
        const numCols = Math.min(report.columns.length, 8); // show up to 8 primary columns in PDF
        const activeColumns = report.columns.slice(0, numCols);
        const colWidth = availWidth / numCols;

        const drawTableHeader = (yPos: number) => {
          doc.rect(30, yPos, availWidth, 18).fill('#1E293B');
          doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
          activeColumns.forEach((col, idx) => {
            doc.text(col.label, 32 + idx * colWidth, yPos + 4, {
              width: colWidth - 4,
              ellipsis: true,
            });
          });
        };

        drawTableHeader(currentY);
        currentY += 18;

        let rowCount = 0;
        let isEven = false;

        for await (const chunk of stream) {
          for (const row of chunk) {
            rowCount++;
            if (rowCount > maxPdfRows) break;

            // Check if new page needed
            if (currentY > doc.page.height - 50) {
              doc.addPage({ layout: 'landscape', size: 'A4', margin: 30 });
              currentY = 30;
              drawTableHeader(currentY);
              currentY += 18;
            }

            // Row background
            if (isEven) {
              doc.rect(30, currentY, availWidth, 14).fill('#F8FAFC');
            }
            isEven = !isEven;

            doc.fillColor('#334155').fontSize(7).font('Helvetica');
            activeColumns.forEach((col, idx) => {
              const rawVal = row[col.key];
              const textVal = rawVal !== null && rawVal !== undefined ? String(rawVal) : '—';
              doc.text(textVal, 32 + idx * colWidth, currentY + 3, {
                width: colWidth - 4,
                ellipsis: true,
              });
            });

            currentY += 14;
          }
          if (rowCount > maxPdfRows) break;
        }

        // Page numbering footer
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fillColor('#94A3B8').fontSize(7).font('Helvetica');
          doc.text(
            `Confidential - Hardware Management System | Page ${i + 1} of ${pages.count}`,
            30,
            doc.page.height - 20,
            { align: 'center', width: doc.page.width - 60 },
          );
        }

        doc.end();

        output.on('finish', () => {
          resolve({ rowCount });
        });
        output.on('error', (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    })();
  });
}
