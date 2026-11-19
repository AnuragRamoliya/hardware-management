import { DataTypes } from 'sequelize';

export const usersSchema = {
  role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  first_name: { type: DataTypes.STRING(255), allowNull: false },
  last_name: { type: DataTypes.STRING(255), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false },
  password: { type: DataTypes.STRING(255), allowNull: false },
  image: { type: DataTypes.STRING(255), allowNull: true },
  failed_login_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  locked_until: { type: DataTypes.DATE, allowNull: true },
  consent_accepted_at: { type: DataTypes.DATE, allowNull: true },
  consent_version: { type: DataTypes.STRING(20), allowNull: true },
};

export const userTokensSchema = {
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  token: { type: DataTypes.STRING(512), allowNull: true, unique: true },
  refresh_token_hash: { type: DataTypes.STRING(64), allowNull: true, unique: true },
  expires_at: { type: DataTypes.DATE, allowNull: true },
  refresh_expires_at: { type: DataTypes.DATE, allowNull: true },
  otp: { type: DataTypes.STRING(10), allowNull: true },
  otp_reference: { type: DataTypes.STRING(512), allowNull: true },
  reset_token: { type: DataTypes.STRING(512), allowNull: true },
  is_revoked: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  device_name: { type: DataTypes.STRING(255), allowNull: true },
  ip_address: { type: DataTypes.STRING(100), allowNull: true },
  user_agent: { type: DataTypes.STRING(500), allowNull: true },
  last_active_at: { type: DataTypes.DATE, allowNull: true },
};
