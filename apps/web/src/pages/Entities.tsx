import { ResourcePage } from "@/pages/ResourcePage";
import { employeeConfig } from "@/pages/resources";
import { AuditLogs as AuditLogsPage } from "@/pages/AuditLogs";

export const Employees = () => <ResourcePage config={employeeConfig} />;
export { Users } from "@/pages/Users";
export { RolesPage as Roles } from "@/pages/Roles";
export { Departments } from "@/pages/Departments";
export { Designations } from "@/pages/Designations";
export { Locations } from "@/pages/Locations";
export { Vendors } from "@/pages/Vendors";
export { AssetCategories } from "@/pages/AssetCategories";
export const AuditLogs = () => <AuditLogsPage />;
