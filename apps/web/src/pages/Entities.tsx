import { ResourcePage } from "@/pages/ResourcePage";
import { employeeConfig, roleConfig } from "@/pages/resources";
import { AuditLogs as AuditLogsPage } from "@/pages/AuditLogs";

export const Employees = () => <ResourcePage config={employeeConfig} />;
export { Users } from "@/pages/Users";
export const Roles = () => <ResourcePage config={roleConfig} />;
export { Departments } from "@/pages/Departments";
export { Designations } from "@/pages/Designations";
export { Locations } from "@/pages/Locations";
export { Vendors } from "@/pages/Vendors";
export { AssetCategories } from "@/pages/AssetCategories";
export const AuditLogs = () => <AuditLogsPage />;
