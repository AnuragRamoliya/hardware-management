import { vendorsApi } from "@/api/resourceApi";
export const getVendorListApi = vendorsApi.list;
export const getVendorByIdApi = vendorsApi.get;
export const addVendorApi = vendorsApi.add;
export const updateVendorApi = vendorsApi.update;
export const deleteVendorApi = vendorsApi.remove;
