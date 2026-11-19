import { DataTypes } from 'sequelize';

export const requestCommentsSchema = {
  request_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  comment: { type: DataTypes.TEXT, allowNull: false },
  is_internal: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
};
