import { DataTypes } from 'sequelize';

export const credentialAccessLogsSchema = {
  credential_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  employee_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  accessed_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  action: { type: DataTypes.STRING(50), allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: true },
  ip_address: { type: DataTypes.STRING(100), allowNull: true },
  user_agent: { type: DataTypes.STRING(500), allowNull: true },
  success: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
  failure_reason: { type: DataTypes.STRING(255), allowNull: true },
  accessed_at: { type: DataTypes.DATE, allowNull: false },
  prev_hash: { type: DataTypes.STRING(64), allowNull: false },
  hash: { type: DataTypes.STRING(64), allowNull: false },
};
