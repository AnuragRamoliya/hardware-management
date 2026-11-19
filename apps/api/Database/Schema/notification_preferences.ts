import { DataTypes } from 'sequelize';

export const notificationPreferencesSchema = {
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  category: { type: DataTypes.STRING(50), allowNull: false },
  in_app: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
  email: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
  desktop: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  sound: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
};
