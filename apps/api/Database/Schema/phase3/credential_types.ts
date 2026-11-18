import { DataTypes } from 'sequelize';

export const credentialTypesSchema = {
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  category: { type: DataTypes.STRING(50), allowNull: false },
  icon: { type: DataTypes.STRING(100), allowNull: true },
  expiry_days: { type: DataTypes.INTEGER, allowNull: true },
  min_length: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 12 },
  require_complexity: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
  requires_approval: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
  allow_employee_submit: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
  notes: { type: DataTypes.TEXT, allowNull: true },
};
