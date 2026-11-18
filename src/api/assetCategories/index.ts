import { assetCategoriesApi } from "@/api/resourceApi";
export const getAssetCategoryListApi = assetCategoriesApi.list;
export const getAssetCategoryByIdApi = assetCategoriesApi.get;
export const addAssetCategoryApi = assetCategoriesApi.add;
export const updateAssetCategoryApi = assetCategoriesApi.update;
export const deleteAssetCategoryApi = assetCategoriesApi.remove;
