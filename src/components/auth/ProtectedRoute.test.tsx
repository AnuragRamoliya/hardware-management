import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import {
  PermissionGuard,
  ProtectedRoute,
  RoleGuard,
} from "@/components/auth/ProtectedRoute";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";

describe("route guards", () => {
  beforeEach(() => useAuthStore.getState().logout());
  it("redirects unauthenticated users to login", () => {
    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/private" element={<p>Private content</p>} />
          </Route>
          <Route path="/login" element={<p>Sign in</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });
  it("denies a role not in the route allow-list", () => {
    useAuthStore.getState().setSession("token", null, {
      id: 1,
      first_name: "Employee",
      email: "person@example.com",
      role_name: "employee",
    });
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RoleGuard allow={["admin"]}>
                <p>Admin content</p>
              </RoleGuard>
            }
          />
          <Route path="/" element={<p>Workspace home</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Workspace home")).toBeInTheDocument();
  });

  it("uses the loaded API permission map for module route access", () => {
    useAuthStore.getState().setSession("token", null, {
      id: 1,
      first_name: "HR",
      email: "hr@example.com",
      role_name: "hr",
    });
    usePermissionStore.getState().setPermissions({
      employee: {
        read_access: true,
        write_access: false,
        delete_access: false,
      },
    });
    render(
      <MemoryRouter initialEntries={["/employees"]}>
        <Routes>
          <Route
            path="/employees"
            element={
              <PermissionGuard module="employee">
                <p>Employee records</p>
              </PermissionGuard>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Employee records")).toBeInTheDocument();
  });
});
