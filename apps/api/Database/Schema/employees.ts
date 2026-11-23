import { DataTypes } from 'sequelize';

export const employeesSchema = {
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, unique: true },
  employee_code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  first_name: { type: DataTypes.STRING(255), allowNull: false },
  last_name: { type: DataTypes.STRING(255), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false },
  phone: { type: DataTypes.STRING(50), allowNull: true },
  department_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  designation_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  manager_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  location_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  join_date: { type: DataTypes.DATEONLY, allowNull: true },
  last_working_date: { type: DataTypes.DATEONLY, allowNull: true },
  employment_status: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
  profile_image: { type: DataTypes.STRING(255), allowNull: true },
  vault_consent_accepted_at: { type: DataTypes.DATE, allowNull: true },
};
