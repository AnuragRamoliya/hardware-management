import { beforeEach, describe, expect, it, vi } from "vitest";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { setRouterNavigate } from "@/routes/navigation";

describe("persisted auth store", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
    usePermissionStore.getState().clearPermissions();
  });

  it("stores a session and clears credentials on logout", () => {
    const navigate = vi.fn();
    setRouterNavigate(navigate);
    const user = {
      id: "u-1",
      first_name: "Taylor",
      email: "taylor@example.com",
    };
    useAuthStore.getState().setSession("token-1", "refresh-1", user);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(localStorage.getItem("token")).toBe("token-1");
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
    expect(navigate).toHaveBeenCalledWith("/login", { replace: true });
    setRouterNavigate(() => undefined);
  });

  it("replaces permission state without changing the user session", () => {
    useAuthStore.getState().setSession("token-1", null, {
      id: 1,
      first_name: "Sam",
      email: "sam@example.com",
    });
    usePermissionStore.getState().setPermissions({
      employee: {
        read_access: true,
        write_access: false,
        delete_access: false,
      },
    });
    expect(
      usePermissionStore.getState().modulePermissions.employee.read_access,
    ).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
