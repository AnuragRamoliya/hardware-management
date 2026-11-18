import { DataTypes } from 'sequelize';

export const notificationsSchema = {
  recipient_user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  kind: { type: DataTypes.STRING(40), allowNull: false },
  record_type: { type: DataTypes.STRING(40), allowNull: false },
  record_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  threshold_days: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  message: { type: DataTypes.STRING(500), allowNull: false },
  read_at: { type: DataTypes.DATE, allowNull: true },
};
