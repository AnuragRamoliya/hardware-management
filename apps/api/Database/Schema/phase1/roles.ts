import { DataTypes } from 'sequelize';

export const rolesSchema = {
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  type: { type: DataTypes.STRING(50), allowNull: false },
};
