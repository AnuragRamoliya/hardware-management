import { api_methods, endPoints } from "@/api/endpoint";
import { callApi } from "@/api/callApi";
import type { ListQuery, Paginated } from "@/types";

export interface AssetRecord {
  id: string | number;
  asset_tag: string;
  serial_no?: string | null;
  category_id?: number | string | null;
  brand?: string | null;
  model?: string | null;
  vendor_id?: number | string | null;
  purchase_date?: string | null;
  purchase_cost?: number | string | null;
  warranty_end?: string | null;
  condition: "new" | "good" | "fair" | "poor";
  asset_status: number;
  location_id?: number | string | null;
  parent_asset_id?: number | string | null;
  specs?: Record<string, string> | null;
  notes?: string | null;
  accessories?: AssetRecord[];
  current_assignment?: { employee_id: number; employee?: { first_name: string; last_name: string; employee_code: string } } | null;
}
export interface AssignmentRecord {
  id: number;
  asset_id: number;
  employee_id: number;
  assigned_at: string;
  due_return_date?: string | null;
  returned_at?: string | null;
  note?: string | null;
  asset?: AssetRecord;
}
export interface AssetImportResult {
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

export function importAssetsApi(file: File) {
  const body = new FormData();
  body.append("file", file);
  return callApi<AssetImportResult, FormData>({
    url: endPoints.asset.import,
    method: api_methods.POST,
    body,
  });
}

export const assetsApi = {
  list: (query: ListQuery) => callApi<Paginated<AssetRecord>, ListQuery>({ url: endPoints.asset.list, method: api_methods.POST, body: query }),
  unassigned: (query: ListQuery) => callApi<Paginated<AssetRecord>, ListQuery>({ url: endPoints.asset.unassignedList, method: api_methods.POST, body: query }),
  get: (id: string | number) => callApi<AssetRecord>({ url: endPoints.asset.getById(id), method: api_methods.GET }),
  add: (payload: Partial<AssetRecord>) => callApi<AssetRecord, Partial<AssetRecord>>({ url: endPoints.asset.add, method: api_methods.POST, body: payload }),
  update: (payload: Partial<AssetRecord> & { id: string | number }) => callApi<AssetRecord, typeof payload>({ url: endPoints.asset.update, method: api_methods.PUT, body: payload }),
  remove: (id: string | number) => callApi<{ deleted: boolean }>({ url: endPoints.asset.delete(id), method: api_methods.DELETE }),
  assign: (payload: { asset_id: number; employee_id: number; due_return_date?: string; note?: string }) => callApi<AssignmentRecord, typeof payload>({ url: endPoints.asset.assign, method: api_methods.POST, body: payload }),
  returnAsset: (payload: { asset_id: number; return_condition?: string; notes?: string; to_status?: string }) => callApi<AssignmentRecord, typeof payload>({ url: endPoints.asset.return, method: api_methods.POST, body: payload }),
  transfer: (payload: { asset_id: number; to_employee_id: number; note?: string }) => callApi<AssignmentRecord, typeof payload>({ url: endPoints.asset.transfer, method: api_methods.POST, body: payload }),
  bulkAssign: (items: Array<{ asset_id: number; employee_id: number; due_return_date?: string; note?: string }>, all_or_nothing = true) => callApi<AssignmentRecord[], { items: typeof items; all_or_nothing: boolean }>({ url: endPoints.asset.bulkAssign, method: api_methods.POST, body: { items, all_or_nothing } }),
  bulkReturn: (items: Array<{ asset_id: number; return_condition?: string; notes?: string; to_status?: string }>, all_or_nothing = true) => callApi<unknown[], { items: typeof items; all_or_nothing: boolean }>({ url: endPoints.asset.bulkReturn, method: api_methods.POST, body: { items, all_or_nothing } }),
  history: (asset_id: number) => callApi<AssignmentRecord[], { asset_id: number }>({ url: endPoints.asset.history, method: api_methods.POST, body: { asset_id } }),
  maintenance: (id: number, issue: string) => callApi<unknown, { asset_id: number; issue: string }>({ url: endPoints.asset.maintenance.add, method: api_methods.POST, body: { asset_id: id, issue } }),
};
