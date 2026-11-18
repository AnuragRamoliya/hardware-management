import { employeesApi } from "@/api/resourceApi";
import { callApi } from "@/api/callApi";
import { api_methods, endPoints } from "@/api/endpoint";

export interface EmployeeImportResult {
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

export const getEmployeeListApi = employeesApi.list;
export const getEmployeeByIdApi = employeesApi.get;
export const addEmployeeApi = employeesApi.add;
export const updateEmployeeApi = employeesApi.update;
export const deleteEmployeeApi = employeesApi.remove;

export function importEmployeesApi(file: File) {
  const body = new FormData();
  body.append("file", file);
  return callApi<EmployeeImportResult, FormData>({
    url: endPoints.employee.bulkImport,
    method: api_methods.POST,
    body,
  });
}
