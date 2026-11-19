import { asset_categories } from '../Database/Schema';
import { sequelize } from '../Config/database';
import { MODULES } from '../Config/constant';
import type { CrudResourceDefinition } from '../Services/base_crud.service';

export const assetCategoryDefinition: CrudResourceDefinition = {
  table: 'asset_category',
  module: MODULES.ASSET_CATEGORY,
  writableFields: ['name', 'description', 'status'],
  searchFields: ['name'],
  optionFields: ['id', 'name'],
  filterableFields: { name: 'text', status: 'number' },
  includeAttributes: [
    [
      sequelize.literal(
        '(SELECT COUNT(*) FROM `assets` WHERE `assets`.`category_id` = `asset_categories`.`id` AND `assets`.`status` != 0)',
      ),
      'assets_count',
    ],
  ],
};

export const AssetCategoryModel = asset_categories;
