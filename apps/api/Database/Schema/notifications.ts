import { DataTypes } from 'sequelize';

export const notificationsSchema = {
  recipient_user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  category: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'system' },
  entity_type: { type: DataTypes.STRING(50), allowNull: true },
  entity_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  kind: { type: DataTypes.STRING(40), allowNull: false },
  record_type: { type: DataTypes.STRING(40), allowNull: false },
  record_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  threshold_days: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: true },
  message: { type: DataTypes.STRING(500), allowNull: false },
  link: { type: DataTypes.STRING(255), allowNull: true },
  priority: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 2 },
  read_at: { type: DataTypes.DATE, allowNull: true },
};

export const notificationPreferencesSchema = {
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  category: { type: DataTypes.STRING(50), allowNull: false },
  in_app: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
  email: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
  desktop: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  sound: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
};
