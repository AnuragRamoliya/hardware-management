import { DataTypes } from 'sequelize';

export const permissionsSchema = {
  role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  module_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  read_access: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  write_access: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  delete_access: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  options_access: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  approve_access: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  reveal_access: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
};
