import { DataTypes } from 'sequelize';

export const modulesSchema = {
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
};
