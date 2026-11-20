import { DataTypes } from 'sequelize';

export const offboardingTasksSchema = {
  case_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  task_type: { type: DataTypes.STRING(30), allowNull: false },
  priority: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'standard' },
  ref_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  ref_label: { type: DataTypes.STRING(255), allowNull: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  assigned_to: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  task_status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'pending' },
  is_mandatory: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  completed_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  return_condition: { type: DataTypes.STRING(50), allowNull: true },
  to_status: { type: DataTypes.STRING(50), allowNull: true },
  outcome_notes: { type: DataTypes.TEXT, allowNull: true },
  waived_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  waive_reason: { type: DataTypes.TEXT, allowNull: true },
};
