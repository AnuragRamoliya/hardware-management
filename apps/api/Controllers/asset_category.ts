import { BaseCrudController } from './base_crud.controller';
import { AssetCategoryService } from '../Services/asset_category';

export class AssetCategoryController extends BaseCrudController {
  constructor(service = new AssetCategoryService()) {
    super(service, 'Asset Category');
  }
}
