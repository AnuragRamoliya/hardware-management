import ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';
import { Readable } from 'node:stream';
import { AppError } from '../Config/app_error';
import type { UserInfo } from '../Types/api';
import { EmployeeService } from './employees';

export interface EmployeeImportResult {
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

export class EmployeeImportService {
  constructor(private readonly employeeService = new EmployeeService()) {}

  async import(file: Express.Multer.File, actor: UserInfo): Promise<EmployeeImportResult> {
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    let rows: Record<string, unknown>[];
    if (extension === 'csv') {
      rows = parse(file.buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<
        string,
        unknown
      >[];
    } else if (extension === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.read(Readable.from([file.buffer]));
      const firstSheet = workbook.worksheets[0];
      if (!firstSheet) throw new AppError(400, 'The uploaded workbook has no worksheet.');
      const headers: string[] = [];
      for (let column = 1; column <= firstSheet.columnCount; column += 1) {
        headers.push(firstSheet.getRow(1).getCell(column).text.trim());
      }
      rows = [];
      firstSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        rows.push(
          Object.fromEntries(
            headers.map((header, index) => [header, row.getCell(index + 1).text || null]),
          ),
        );
      });
    } else {
      throw new AppError(400, 'Upload a CSV or XLSX file.');
    }

    const result: EmployeeImportResult = { imported: 0, errors: [] };
    for (const [index, input] of rows.entries()) {
      try {
        if (!input.employee_code || !input.first_name || !input.last_name || !input.email) {
          throw new Error('employee_code, first_name, last_name, and email are required.');
        }
        const normalized = {
          ...input,
          ...(typeof input.create_login === 'string'
            ? { create_login: input.create_login.toLowerCase() === 'true' }
            : {}),
          ...(input.employment_status !== null && input.employment_status !== undefined
            ? { employment_status: Number(input.employment_status) }
            : {}),
        };
        await this.employeeService.add(normalized, actor);
        result.imported += 1;
      } catch (error) {
        result.errors.push({
          row: index + 2,
          message:
            error instanceof AppError
              ? error.message
              : 'Row could not be imported; verify its required fields and unique values.',
        });
      }
    }
    return result;
  }
}
