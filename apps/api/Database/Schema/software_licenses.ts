import { DataTypes } from 'sequelize';

export const softwareLicensesSchema = {
  software_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  license_key: { type: DataTypes.TEXT, allowNull: true },
  seats_total: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
  purchase_date: { type: DataTypes.DATEONLY, allowNull: true },
  expiry_date: { type: DataTypes.DATEONLY, allowNull: true },
};
