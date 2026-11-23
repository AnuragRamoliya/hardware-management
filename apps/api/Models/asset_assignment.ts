import { asset_assignments, assets, employees } from '../Database/Schema';

/** Sequelize records used by assignment workflows and their history views. */
export const AssetAssignmentRecord = asset_assignments;
export const AssignedAssetRecord = assets;
export const AssignmentEmployeeRecord = employees;
