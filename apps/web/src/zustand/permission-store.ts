import { create } from "zustand";
import type { PermissionSet } from "@/types";

interface PermissionState {
  modulePermissions: Record<string, PermissionSet>;
  permissionsLoaded: boolean;
  setPermissions: (permissions: Record<string, PermissionSet>) => void;
  clearPermissions: () => void;
}

const usePermissionStore = create<PermissionState>((set) => ({
  modulePermissions: {},
  permissionsLoaded: false,
  setPermissions: (modulePermissions) =>
    set({ modulePermissions, permissionsLoaded: true }),
  clearPermissions: () =>
    set({ modulePermissions: {}, permissionsLoaded: false }),
}));

export default usePermissionStore;
