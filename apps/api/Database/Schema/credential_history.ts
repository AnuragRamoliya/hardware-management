import { DataTypes } from 'sequelize';

export const credentialHistorySchema = {
  credential_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  changed_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  change_type: { type: DataTypes.STRING(50), allowNull: false },
  meta: { type: DataTypes.JSON, allowNull: true },
};
