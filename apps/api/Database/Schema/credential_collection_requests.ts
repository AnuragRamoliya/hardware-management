import { DataTypes } from 'sequelize';

export const credentialCollectionRequestsSchema = {
  employee_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  credential_type_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  requested_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: true },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  request_status: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
  credential_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  fulfilled_at: { type: DataTypes.DATE, allowNull: true },
};
