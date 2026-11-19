import { DataTypes } from 'sequelize';

export const locationsSchema = {
  name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  address: { type: DataTypes.TEXT, allowNull: true },
};
