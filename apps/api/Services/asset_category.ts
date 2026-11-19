import { BaseCrudService } from './base_crud.service';
import { AssetCategoryModel, assetCategoryDefinition } from '../Models/asset_category';

export class AssetCategoryService extends BaseCrudService {
  constructor() {
    super(AssetCategoryModel, assetCategoryDefinition);
  }
}
