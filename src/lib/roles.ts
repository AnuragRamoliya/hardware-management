import type { User, UserRoleName } from "@/types";

export function normalizeRoleName(value?: string): UserRoleName | undefined {
  const normalized = value?.toLowerCase().replace(/[\s_-]/g, "");
  if (normalized === "admin" || normalized === "superadmin") return "admin";
  if (normalized === "hardware" || normalized === "hardwaremanager")
    return "hardware";
  if (normalized === "hr" || normalized === "employee") return normalized;
  return undefined;
}

export function getUserRole(user?: User | null): UserRoleName {
  return (
    normalizeRoleName(user?.role_name) ??
    normalizeRoleName(user?.role?.name) ??
    "employee"
  );
}
