import { DataTypes } from 'sequelize';

export const assetsSchema = {
  asset_tag: { type: DataTypes.STRING(32), allowNull: false, unique: true },
  serial_no: { type: DataTypes.STRING(150), allowNull: true, unique: true },
  category_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  brand: { type: DataTypes.STRING(120), allowNull: true },
  model: { type: DataTypes.STRING(150), allowNull: true },
  vendor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  purchase_date: { type: DataTypes.DATEONLY, allowNull: true },
  purchase_cost: { type: DataTypes.DECIMAL(13, 2), allowNull: true },
  warranty_start: { type: DataTypes.DATEONLY, allowNull: true },
  warranty_end: { type: DataTypes.DATEONLY, allowNull: true },
  condition: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'good' },
  asset_status: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
  location_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  parent_asset_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  specs: { type: DataTypes.JSON, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  photo_url: { type: DataTypes.STRING(500), allowNull: true },
};
