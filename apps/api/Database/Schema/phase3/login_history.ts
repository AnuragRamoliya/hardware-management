import { DataTypes } from 'sequelize';

export const loginHistorySchema = {
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  email_attempted: { type: DataTypes.STRING(255), allowNull: false },
  success: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  ip_address: { type: DataTypes.STRING(100), allowNull: true },
  user_agent: { type: DataTypes.STRING(500), allowNull: true },
  device_name: { type: DataTypes.STRING(255), allowNull: true },
  failure_reason: { type: DataTypes.STRING(255), allowNull: true },
};
