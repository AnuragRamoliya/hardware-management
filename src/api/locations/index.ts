import { locationsApi } from "@/api/resourceApi";
export const getLocationListApi = locationsApi.list;
export const getLocationByIdApi = locationsApi.get;
export const addLocationApi = locationsApi.add;
export const updateLocationApi = locationsApi.update;
export const deleteLocationApi = locationsApi.remove;
