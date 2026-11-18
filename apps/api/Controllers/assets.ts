import type { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { parse as parseCsv } from 'csv-parse/sync';
import QRCode from 'qrcode';
import { env } from '../Config/env';
import { AppError } from '../Config/app_error';
import {
  AssetCategoryRecord as asset_categories,
  AssetLocationRecord as locations,
  AssetVendorRecord as vendors,
} from '../Models/assets';
import { AssetService } from '../Services/assets';
import { getOptions } from '../Models/options';
import { getActor } from '../Utils/route_handler';

const assetsService = new AssetService();

export class AssetsController {
  async list(request: Request) {
    return assetsService.list(request.body);
  }
  async unassigned(request: Request) {
    return assetsService.list(request.body, true);
  }
  async add(request: Request) {
    return assetsService.add(request.body, getActor(request));
  }
  async update(request: Request) {
    return assetsService.update(request.body, getActor(request));
  }
  async get(request: Request) {
    return assetsService.get(Number(request.params.id));
  }
  async delete(request: Request) {
    await assetsService.remove(Number(request.params.id), getActor(request));
    return { deleted: true };
  }
  async options(request: Request) {
    return getOptions('asset', request.body);
  }
  async qr(request: Request, response: Response): Promise<void> {
    const asset = await assetsService.get(Number(request.params.id));
    const payload =
      env.SERVER_PATH.replace(/\/$/, '') +
      '/assets/' +
      asset.id +
      '?tag=' +
      encodeURIComponent(String(asset.asset_tag));
    if (request.query.format === 'png') {
      response
        .type('png')
        .send(await QRCode.toBuffer(payload, { type: 'png', width: 360, margin: 1 }));
      return;
    }
    response
      .type('image/svg+xml')
      .send(await QRCode.toString(payload, { type: 'svg', width: 360, margin: 1 }));
  }
  template(_request: Request, response: Response): void {
    response
      .type('text/csv')
      .attachment('asset-import-template.csv')
      .send(
        'serial_no,category,vendor,brand,model,purchase_date,purchase_cost,warranty_start,warranty_end,condition,location,notes\n',
      );
  }
  async import(request: Request) {
    if (!request.file) throw new AppError(422, 'Upload a CSV or XLSX file.');
    const records = await this.readImportRows(request);
    const errors: Array<{ row: number; message: string }> = [];
    let imported = 0;
    for (const [index, row] of records.entries()) {
      try {
        const values: Record<string, unknown> = { ...row };
        for (const [inputKey, field, model] of [
          ['category', 'category_id', asset_categories],
          ['vendor', 'vendor_id', vendors],
          ['location', 'location_id', locations],
        ] as const) {
          if (!row[inputKey]) continue;
          const found = await model.findOne({ where: { name: String(row[inputKey]), status: 1 } });
          if (!found) throw new AppError(422, 'Unknown ' + inputKey + ': ' + String(row[inputKey]));
          values[field] = found.get('id');
          delete values[inputKey];
        }
        delete values.asset_tag;
        await assetsService.add(values, getActor(request));
        imported += 1;
      } catch (error) {
        errors.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Invalid row.',
        });
      }
    }
    return { imported, errors };
  }
  async export(request: Request, response: Response): Promise<void> {
    const result = await assetsService.list({
      ...request.body,
      currentPage: 1,
      itemsPerPage: 10000,
    });
    const csv = [
      'asset_tag,serial_no,brand,model,asset_status',
      ...result.rows.map((row) =>
        [row.asset_tag, row.serial_no, row.brand, row.model, row.asset_status]
          .map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
          .join(','),
      ),
    ].join('\n');
    response.type('text/csv').attachment('assets.csv').send(csv);
  }
  private async readImportRows(request: Request): Promise<Record<string, unknown>[]> {
    const file = request.file;
    if (!file) throw new AppError(422, 'Upload a CSV or XLSX file.');
    if (!/\.xlsx$/i.test(file.originalname)) {
      return parseCsv(file.buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<
        string,
        unknown
      >[];
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as never);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new AppError(422, 'The workbook has no worksheet.');
    const headers = (sheet.getRow(1).values as unknown[])
      .slice(1)
      .map((value) => String(value ?? '').trim());
    const records: Record<string, unknown>[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber < 2) return;
      const values = (row.values as unknown[]).slice(1);
      records.push(Object.fromEntries(headers.map((header, index) => [header, values[index]])));
    });
    return records;
  }
}
