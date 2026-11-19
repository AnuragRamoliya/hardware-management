import { DataTypes } from 'sequelize';

export const appSettingsSchema = {
  key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  value: { type: DataTypes.TEXT, allowNull: true },
  description: { type: DataTypes.STRING(255), allowNull: true },
};
