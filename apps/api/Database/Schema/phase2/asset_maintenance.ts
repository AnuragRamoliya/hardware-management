import { DataTypes } from 'sequelize';

export const assetMaintenanceSchema = {
  asset_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  issue: { type: DataTypes.TEXT, allowNull: false },
  vendor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  cost: { type: DataTypes.DECIMAL(13, 2), allowNull: true },
  sent_at: { type: DataTypes.DATE, allowNull: false },
  returned_at: { type: DataTypes.DATE, allowNull: true },
  resolution: { type: DataTypes.TEXT, allowNull: true },
  maintenance_status: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
};
