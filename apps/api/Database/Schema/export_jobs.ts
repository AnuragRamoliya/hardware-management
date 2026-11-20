import { DataTypes } from 'sequelize';
import { EXPORT_JOB_STATUS } from '@hm/shared';

export const exportJobsSchema = {
  report_key: { type: DataTypes.STRING(100), allowNull: false },
  format: { type: DataTypes.STRING(20), allowNull: false },
  filters: { type: DataTypes.JSON, allowNull: true },
  job_status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: EXPORT_JOB_STATUS.QUEUED,
  },
  progress: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  row_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  file_path: { type: DataTypes.STRING(500), allowNull: true },
  file_sha256: { type: DataTypes.STRING(64), allowNull: true },
  error: { type: DataTypes.TEXT, allowNull: true },
  requested_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
};
