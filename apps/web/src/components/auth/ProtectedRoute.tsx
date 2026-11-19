import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "@/zustand/user-store";
import type { UserRoleName } from "@/types";
import { PATHS } from "@/routes/paths";
import { getUserRole } from "@/lib/roles";
import usePermissionStore from "@/zustand/permission-store";
import { Spinner } from "@/components/common/States";

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to={PATHS.LOGIN} replace />;
}

export function RoleGuard({
  allow,
  children,
}: {
  allow: UserRoleName[];
  children: React.ReactNode;
}) {
  const role = useAuthStore((state) => getUserRole(state.user));
  const fallback = role === "employee" ? PATHS.PORTAL : PATHS.ROOT;
  return allow.includes(role) ? (
    <>{children}</>
  ) : (
    <Navigate to={fallback} replace />
  );
}

export function PermissionGuard({
  module,
  children,
}: {
  module: string;
  children: React.ReactNode;
}) {
  const role = useAuthStore((state) => getUserRole(state.user));
  const permission = usePermissionStore(
    (state) => state.modulePermissions[module],
  );
  const permissionsLoaded = usePermissionStore(
    (state) => state.permissionsLoaded,
  );
  if (role === "admin") return <>{children}</>;
  if (!permissionsLoaded) return <Spinner label="Checking permissions" />;
  const fallback = role === "employee" ? PATHS.PORTAL : PATHS.ROOT;
  return permission?.read_access ? (
    <>{children}</>
  ) : (
    <Navigate to={fallback} replace />
  );
}
