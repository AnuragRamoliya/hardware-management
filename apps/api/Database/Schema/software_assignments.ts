import { DataTypes } from 'sequelize';

export const softwareAssignmentsSchema = {
  software_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  license_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  employee_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  assigned_at: { type: DataTypes.DATE, allowNull: false },
  assigned_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  revoked_at: { type: DataTypes.DATE, allowNull: true },
  revoked_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  note: { type: DataTypes.TEXT, allowNull: true },
};
