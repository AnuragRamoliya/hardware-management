import React, { createContext, useContext, type ReactNode } from "react";

export interface PermissionContextValue {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const defaultContext: PermissionContextValue = {
  permissions: ["*"],
  hasPermission: () => true,
  hasRole: () => true,
};

const PermissionContext = createContext<PermissionContextValue>(defaultContext);

export function PermissionProvider({
  permissions = ["*"],
  roles = [],
  children,
}: {
  permissions?: string[];
  roles?: string[];
  children: ReactNode;
}) {
  const hasPermission = (perm: string): boolean => {
    if (permissions.includes("*")) return true;
    return permissions.includes(perm);
  };

  const hasRole = (role: string): boolean => {
    if (roles.includes("admin") || roles.includes("super_admin")) return true;
    return roles.includes(role);
  };

  return (
    <PermissionContext.Provider value={{ permissions, hasPermission, hasRole }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions(): PermissionContextValue {
  return useContext(PermissionContext);
}

export function Can({
  perform,
  fallback = null,
  children,
}: {
  perform: string;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { hasPermission } = usePermissions();
  if (hasPermission(perform)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
