import { DataTypes } from 'sequelize';

export const offboardingCasesSchema = {
  case_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  employee_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  exit_type: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  resignation_date: { type: DataTypes.DATEONLY, allowNull: false },
  last_working_date: { type: DataTypes.DATEONLY, allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: false },
  initiated_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  handover_to: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  manager_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  case_status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'open' },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  clearance_number: { type: DataTypes.STRING(100), allowNull: true },
  clearance_issued_at: { type: DataTypes.DATE, allowNull: true },
  clearance_file_path: { type: DataTypes.STRING(255), allowNull: true },
  handover_receipt_file_path: { type: DataTypes.STRING(255), allowNull: true },
  verification_code: { type: DataTypes.STRING(50), allowNull: true },
  verification_hash: { type: DataTypes.STRING(64), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
};
