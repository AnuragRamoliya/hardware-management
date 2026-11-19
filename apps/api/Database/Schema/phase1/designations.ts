import { DataTypes } from 'sequelize';

export const designationsSchema = {
  name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: true },
};
