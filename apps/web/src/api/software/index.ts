import { api_methods, endPoints } from "@/api/endpoint";
import { callApi } from "@/api/callApi";
import type { ListQuery, Paginated } from "@/types";

export interface SoftwareRecord {
  id: string | number;
  name: string;
  vendor_id?: number | string | null;
  category: string;
  license_type: string;
  cost?: string | number | null;
  billing_cycle?: string | null;
  renewal_date?: string | null;
  notes?: string | null;
  seats_total?: number;
  seats_used?: number;
  seats_available?: number;
}
export interface LicenseRecord {
  id: string | number;
  software_id: string | number;
  seats_total: number;
  seats_used?: number;
  seats_available?: number;
  purchase_date?: string | null;
  expiry_date?: string | null;
}
export interface SoftwareAssignment {
  id: string | number;
  software_id: string | number;
  employee_id: string | number;
  license_id?: string | number | null;
  assigned_at: string;
  revoked_at?: string | null;
  employee?: { first_name: string; last_name: string; employee_code: string };
  software?: SoftwareRecord;
}
export const softwareApi = {
  list: (query: ListQuery) => callApi<Paginated<SoftwareRecord>, ListQuery>({ url: endPoints.software.list, method: api_methods.POST, body: query }),
  get: (id: string | number) => callApi<SoftwareRecord>({ url: endPoints.software.getById(id), method: api_methods.GET }),
  add: (body: Partial<SoftwareRecord>) => callApi<SoftwareRecord, Partial<SoftwareRecord>>({ url: endPoints.software.add, method: api_methods.POST, body }),
  update: (body: Partial<SoftwareRecord> & { id: string | number }) => callApi<SoftwareRecord, typeof body>({ url: endPoints.software.update, method: api_methods.PUT, body }),
  remove: (id: string | number) => callApi<unknown>({ url: endPoints.software.delete(id), method: api_methods.DELETE }),
  licenses: (body: ListQuery) => callApi<Paginated<LicenseRecord>, ListQuery>({ url: endPoints.software.license.list, method: api_methods.POST, body }),
  addLicense: (body: { software_id: number; license_key?: string; seats_total: number; purchase_date?: string; expiry_date?: string }) => callApi<LicenseRecord, typeof body>({ url: endPoints.software.license.add, method: api_methods.POST, body }),
  updateLicense: (body: Partial<LicenseRecord> & { id: string | number }) => callApi<LicenseRecord, typeof body>({ url: endPoints.software.license.update, method: api_methods.PUT, body }),
  usage: (id: number) => callApi<SoftwareAssignment[]>({ url: endPoints.software.usage(id), method: api_methods.GET }),
  assign: (body: { software_id: number; employee_id: number; license_id?: number }) => callApi<SoftwareAssignment, typeof body>({ url: endPoints.software.assign, method: api_methods.POST, body }),
  revoke: (assignment_id: number) => callApi<unknown, { assignment_id: number }>({ url: endPoints.software.revoke, method: api_methods.POST, body: { assignment_id } }),
};
