import { departmentsApi } from "@/api/resourceApi";
export const getDepartmentListApi = departmentsApi.list;
export const getDepartmentByIdApi = departmentsApi.get;
export const addDepartmentApi = departmentsApi.add;
export const updateDepartmentApi = departmentsApi.update;
export const deleteDepartmentApi = departmentsApi.remove;
