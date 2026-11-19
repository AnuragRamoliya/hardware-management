import { DataTypes } from 'sequelize';

export const requestStatusHistorySchema = {
  request_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  from_status: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  to_status: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  changed_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  note: { type: DataTypes.TEXT, allowNull: true },
};
