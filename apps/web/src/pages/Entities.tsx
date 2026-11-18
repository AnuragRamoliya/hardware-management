import { ResourcePage } from "@/pages/ResourcePage";
import {
  employeeConfig,
  userConfig,
  roleConfig,
  assetCategoryConfig,
} from "@/pages/resources";
import { AuditLogs as AuditLogsPage } from "@/pages/AuditLogs";

export const Employees = () => <ResourcePage config={employeeConfig} />;
export const Users = () => <ResourcePage config={userConfig} />;
export const Roles = () => <ResourcePage config={roleConfig} />;
export { Departments } from "@/pages/Departments";
export { Designations } from "@/pages/Designations";
export { Locations } from "@/pages/Locations";
export { Vendors } from "@/pages/Vendors";
export const AssetCategories = () => (
  <ResourcePage config={assetCategoryConfig} />
);
export const AuditLogs = () => <AuditLogsPage />;
