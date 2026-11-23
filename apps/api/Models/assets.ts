import { asset_categories, assets, locations, vendors } from '../Database/Schema';

/** Sequelize records used by the asset domain service. */
export const AssetRecord = assets;
export const AssetCategoryRecord = asset_categories;
export const AssetVendorRecord = vendors;
export const AssetLocationRecord = locations;
