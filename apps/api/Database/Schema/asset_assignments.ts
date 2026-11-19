import { DataTypes } from 'sequelize';

export const assetAssignmentsSchema = {
  asset_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  employee_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  assigned_at: { type: DataTypes.DATE, allowNull: false },
  assigned_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  request_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  due_return_date: { type: DataTypes.DATEONLY, allowNull: true },
  returned_at: { type: DataTypes.DATE, allowNull: true },
  received_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  return_condition: { type: DataTypes.STRING(16), allowNull: true },
  return_notes: { type: DataTypes.TEXT, allowNull: true },
  note: { type: DataTypes.TEXT, allowNull: true },
};
