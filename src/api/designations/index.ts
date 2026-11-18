import { designationsApi } from "@/api/resourceApi";
export const getDesignationListApi = designationsApi.list;
export const getDesignationByIdApi = designationsApi.get;
export const addDesignationApi = designationsApi.add;
export const updateDesignationApi = designationsApi.update;
export const deleteDesignationApi = designationsApi.remove;
