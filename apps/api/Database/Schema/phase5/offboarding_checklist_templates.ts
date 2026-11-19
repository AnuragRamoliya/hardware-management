import { DataTypes } from 'sequelize';

export const offboardingChecklistTemplatesSchema = {
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  default_assignee_role: { type: DataTypes.STRING(50), allowNull: true },
  is_mandatory: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
  sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  is_active: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
};
