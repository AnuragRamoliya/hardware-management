import { DataTypes } from 'sequelize';

export const requestAttachmentsSchema = {
  request_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  file_name: { type: DataTypes.STRING(255), allowNull: false },
  file_path: { type: DataTypes.STRING(500), allowNull: false },
  mime_type: { type: DataTypes.STRING(100), allowNull: false },
  size: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  uploaded_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
};
