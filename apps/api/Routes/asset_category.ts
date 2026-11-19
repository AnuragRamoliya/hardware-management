import { MODULES } from '../Config/constant';
import { AssetCategoryController } from '../Controllers/asset_category';
import { createResourceRouter } from '../Utils/route_factory';

export const assetCategoryRouter = createResourceRouter(
  MODULES.ASSET_CATEGORY,
  new AssetCategoryController(),
  ['name'],
);
