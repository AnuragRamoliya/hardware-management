import { DataTypes } from 'sequelize';

export const activityLogsSchema = {
  module: { type: DataTypes.STRING(100), allowNull: false },
  module_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  action: { type: DataTypes.STRING(40), allowNull: false },
  field: { type: DataTypes.STRING(100), allowNull: true },
  old_value: { type: DataTypes.JSON, allowNull: true },
  new_value: { type: DataTypes.JSON, allowNull: true },
  description: { type: DataTypes.STRING(500), allowNull: false },
  meta: { type: DataTypes.JSON, allowNull: true },
  created_by_name: { type: DataTypes.STRING(255), allowNull: true },
  prev_hash: { type: DataTypes.STRING(64), allowNull: true },
  hash: { type: DataTypes.STRING(64), allowNull: true },
};

export const appSettingsSchema = {
  key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  value: { type: DataTypes.TEXT, allowNull: true },
  description: { type: DataTypes.STRING(255), allowNull: true },
};
