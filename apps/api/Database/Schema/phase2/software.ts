import { DataTypes } from 'sequelize';

export const softwareSchema = {
  name: { type: DataTypes.STRING(255), allowNull: false },
  vendor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  category: { type: DataTypes.STRING(60), allowNull: false },
  license_type: { type: DataTypes.STRING(24), allowNull: false },
  cost: { type: DataTypes.DECIMAL(13, 2), allowNull: true },
  billing_cycle: { type: DataTypes.STRING(40), allowNull: true },
  renewal_date: { type: DataTypes.DATEONLY, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
};
