import { ResourcePage } from "@/pages/ResourcePage";
import {
  employeeConfig,
  userConfig,
  roleConfig,
  locationConfig,
  vendorConfig,
  assetCategoryConfig,
} from "@/pages/resources";
import { AuditLogs as AuditLogsPage } from "@/pages/AuditLogs";

export const Employees = () => <ResourcePage config={employeeConfig} />;
export const Users = () => <ResourcePage config={userConfig} />;
export const Roles = () => <ResourcePage config={roleConfig} />;
export { Departments } from "@/pages/Departments";
export { Designations } from "@/pages/Designations";
export const Locations = () => <ResourcePage config={locationConfig} />;
export const Vendors = () => <ResourcePage config={vendorConfig} />;
export const AssetCategories = () => (
  <ResourcePage config={assetCategoryConfig} />
);
export const AuditLogs = () => <AuditLogsPage />;
