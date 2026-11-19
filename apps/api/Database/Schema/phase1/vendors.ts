import { DataTypes } from 'sequelize';

export const vendorsSchema = {
  name: { type: DataTypes.STRING(255), allowNull: false },
  contact_name: { type: DataTypes.STRING(255), allowNull: true },
  email: { type: DataTypes.STRING(255), allowNull: true },
  phone: { type: DataTypes.STRING(50), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
};
