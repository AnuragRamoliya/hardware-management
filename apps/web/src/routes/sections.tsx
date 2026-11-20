import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useNavigate,
  useRouteError,
} from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  ProtectedRoute,
  PermissionGuard,
  RoleGuard,
} from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Spinner } from "@/components/common/States";
import { setRouterNavigate } from "@/routes/navigation";
import { PATHS } from "@/routes/paths";
import useAuthStore from "@/zustand/user-store";
import { getUserRole } from "@/lib/roles";

const Dashboard = lazy(() =>
  import("@/pages/Dashboard").then((module) => ({ default: module.Dashboard })),
);
const Login = lazy(() =>
  import("@/pages/Login").then((module) => ({ default: module.Login })),
);
const AuthFlow = lazy(() =>
  import("@/pages/AuthFlow").then((module) => ({
    default: module.ForgotPassword,
  })),
);
const OtpVerification = lazy(() =>
  import("@/pages/AuthFlow").then((module) => ({
    default: module.OtpVerification,
  })),
);
const ResetPassword = lazy(() =>
  import("@/pages/AuthFlow").then((module) => ({
    default: module.ResetPassword,
  })),
);
const Profile = lazy(() =>
  import("@/pages/Profile").then((module) => ({ default: module.Profile })),
);
const DesignSystem = lazy(() =>
  import("@/pages/DesignSystem").then((module) => ({
    default: module.DesignSystem,
  })),
);
const EmployeeDetail = lazy(() =>
  import("@/pages/EmployeeDetail").then((module) => ({
    default: module.EmployeeDetail,
  })),
);
const Notifications = lazy(() =>
  import("@/pages/Notifications").then((module) => ({
    default: module.Notifications,
  })),
);
const Portal = lazy(() =>
  import("@/pages/Portal").then((module) => ({ default: module.Portal })),
);
const NotFound = lazy(() =>
  import("@/pages/NotFound").then((module) => ({ default: module.NotFound })),
);
const Employees = lazy(() =>
  import("@/pages/Employees").then((module) => ({ default: module.Employees })),
);
const Users = lazy(() =>
  import("@/pages/Users").then((module) => ({ default: module.Users })),
);
const Departments = lazy(() =>
  import("@/pages/Departments").then((module) => ({
    default: module.Departments,
  })),
);
const Designations = lazy(() =>
  import("@/pages/Designations").then((module) => ({
    default: module.Designations,
  })),
);
const Locations = lazy(() =>
  import("@/pages/Locations").then((module) => ({ default: module.Locations })),
);
const Vendors = lazy(() =>
  import("@/pages/Vendors").then((module) => ({ default: module.Vendors })),
);
const AssetCategories = lazy(() =>
  import("@/pages/AssetCategories").then((module) => ({
    default: module.AssetCategories,
  })),
);
const AuditLogs = lazy(() =>
  import("@/pages/AuditLogs").then((module) => ({ default: module.AuditLogs })),
);
const Assets = lazy(() =>
  import("@/pages/Assets").then((module) => ({ default: module.Assets })),
);
const UnassignedAssets = lazy(() =>
  import("@/pages/Assets").then((module) => ({
    default: module.UnassignedAssets,
  })),
);
const Maintenance = lazy(() =>
  import("@/pages/Maintenance").then((module) => ({
    default: module.Maintenance,
  })),
);
const AssetDetail = lazy(() =>
  import("@/pages/AssetDetail").then((module) => ({
    default: module.AssetDetail,
  })),
);
const Software = lazy(() =>
  import("@/pages/Software").then((module) => ({ default: module.Software })),
);
const SoftwareDetail = lazy(() =>
  import("@/pages/SoftwareDetail").then((module) => ({
    default: module.SoftwareDetail,
  })),
);
const PortalAssets = lazy(() =>
  import("@/pages/PortalAssets").then((module) => ({
    default: module.PortalAssets,
  })),
);
const PortalSoftware = lazy(() =>
  import("@/pages/PortalSoftware").then((module) => ({
    default: module.PortalSoftware,
  })),
);
const Roles = lazy(() =>
  import("@/pages/Roles").then((module) => ({ default: module.RolesPage })),
);
const Credentials = lazy(() =>
  import("@/pages/Credentials").then((module) => ({
    default: module.Credentials,
  })),
);
const CredentialApprovals = lazy(() =>
  import("@/pages/CredentialApprovals").then((module) => ({
    default: module.CredentialApprovals,
  })),
);
const CredentialTypes = lazy(() =>
  import("@/pages/CredentialTypes").then((module) => ({
    default: module.CredentialTypes,
  })),
);
const CredentialRequests = lazy(() =>
  import("@/pages/CredentialRequests").then((module) => ({
    default: module.CredentialRequests,
  })),
);
const CredentialAccessLogs = lazy(() =>
  import("@/pages/CredentialAccessLogs").then((module) => ({
    default: module.CredentialAccessLogs,
  })),
);
const PortalAccounts = lazy(() =>
  import("@/pages/PortalAccounts").then((module) => ({
    default: module.PortalAccounts,
  })),
);
const OffboardingCases = lazy(() =>
  import("@/pages/OffboardingCases").then((module) => ({
    default: module.OffboardingCases,
  })),
);
const OffboardingCaseDetail = lazy(() =>
  import("@/pages/OffboardingCaseDetail").then((module) => ({
    default: module.OffboardingCaseDetail,
  })),
);
const ScanReturns = lazy(() =>
  import("@/pages/ScanReturns").then((module) => ({
    default: module.ScanReturns,
  })),
);
const OffboardingTemplates = lazy(() =>
  import("@/pages/OffboardingTemplates").then((module) => ({
    default: module.OffboardingTemplates,
  })),
);
const PortalOffboarding = lazy(() =>
  import("@/pages/PortalOffboarding").then((module) => ({
    default: module.PortalOffboarding,
  })),
);
const VerifyDocument = lazy(() =>
  import("@/pages/VerifyDocument").then((module) => ({
    default: module.VerifyDocument,
  })),
);
const NotificationPreferences = lazy(() =>
  import("@/pages/NotificationPreferences").then((module) => ({
    default: module.NotificationPreferences,
  })),
);
const Requests = lazy(() =>
  import("@/pages/Requests").then((module) => ({
    default: module.Requests,
  })),
);
const RequestDetail = lazy(() =>
  import("@/pages/RequestDetail").then((module) => ({
    default: module.RequestDetail,
  })),
);
const PortalRequests = lazy(() =>
  import("@/pages/PortalRequests").then((module) => ({
    default: module.PortalRequests,
  })),
);
const PortalRequestDetail = lazy(() =>
  import("@/pages/PortalRequestDetail").then((module) => ({
    default: module.PortalRequestDetail,
  })),
);

function NavigationBridge() {
  const navigate = useNavigate();
  useEffect(
    () => setRouterNavigate((path, options) => navigate(path, options)),
    [navigate],
  );
  return <Outlet />;
}

function RouteLoading() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Spinner label="Loading page" />
    </div>
  );
}

function RouteError() {
  const error = useRouteError();
  const message =
    error instanceof Error
      ? error.message
      : "The requested page could not be loaded.";
  return (
    <div className="grid min-h-[50vh] place-items-center p-8 text-center">
      <div>
        <h1 className="font-semibold">Unable to load this page</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function page(
  element: React.ReactNode,
  allow?: Array<"admin" | "hardware" | "hr" | "employee">,
  module?: string,
) {
  let guarded = element;
  if (module)
    guarded = <PermissionGuard module={module}>{guarded}</PermissionGuard>;
  if (allow) guarded = <RoleGuard allow={allow}>{guarded}</RoleGuard>;
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteLoading />}>{guarded}</Suspense>
    </ErrorBoundary>
  );
}

function RootRoute() {
  const user = useAuthStore((state) => state.user);
  const role = getUserRole(user);
  if (role === "employee") {
    return <Navigate to={PATHS.PORTAL} replace />;
  }
  return <Dashboard />;
}

// Route objects intentionally share a file; this export is the router entry, not a component.
// eslint-disable-next-line react-refresh/only-export-components
export const routesSection = createBrowserRouter([
  {
    element: <NavigationBridge />,
    errorElement: (
      <ErrorBoundary>
        <RouteError />
      </ErrorBoundary>
    ),
    children: [
      { path: PATHS.LOGIN, element: page(<Login />) },
      { path: PATHS.FORGOT_PASSWORD, element: page(<AuthFlow />) },
      { path: PATHS.OTP_VERIFICATION, element: page(<OtpVerification />) },
      { path: PATHS.RESET_PASSWORD, element: page(<ResetPassword />) },
      { path: PATHS.VERIFY_DOCUMENT, element: page(<VerifyDocument />) },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: PATHS.ROOT, element: page(<RootRoute />) },
              {
                path: PATHS.DASHBOARD,
                element: page(<Dashboard />, ["admin", "hardware", "hr"]),
              },
              { path: PATHS.PROFILE, element: page(<Profile />) },
              { path: PATHS.NOTIFICATIONS, element: page(<Notifications />) },
              {
                path: PATHS.EMPLOYEES,
                element: page(<Employees />, ["admin", "hr"], "employee"),
              },
              {
                path: PATHS.EMPLOYEE_DETAIL,
                element: page(<EmployeeDetail />, ["admin", "hr"], "employee"),
              },
              {
                path: PATHS.USERS,
                element: page(<Users />, ["admin"], "user"),
              },
              {
                path: PATHS.ROLES,
                element: page(<Roles />, ["admin"], "role"),
              },
              {
                path: PATHS.DEPARTMENTS,
                element: page(<Departments />, ["admin", "hr"], "department"),
              },
              {
                path: PATHS.DESIGNATIONS,
                element: page(<Designations />, ["admin", "hr"], "designation"),
              },
              {
                path: PATHS.LOCATIONS,
                element: page(<Locations />, ["admin", "hr"], "location"),
              },
              {
                path: PATHS.VENDORS,
                element: page(<Vendors />, ["admin", "hardware"], "vendor"),
              },
              {
                path: PATHS.ASSET_CATEGORIES,
                element: page(
                  <AssetCategories />,
                  ["admin", "hardware"],
                  "asset_category",
                ),
              },
              {
                path: PATHS.ASSETS,
                element: page(<Assets />, ["admin", "hardware", "hr"], "asset"),
              },
              {
                path: PATHS.ASSET_UNASSIGNED,
                element: page(
                  <UnassignedAssets />,
                  ["admin", "hardware"],
                  "asset",
                ),
              },
              {
                path: PATHS.ASSET_MAINTENANCE,
                element: page(
                  <Maintenance />,
                  ["admin", "hardware", "hr"],
                  "asset_maintenance",
                ),
              },
              {
                path: PATHS.ASSET_DETAIL,
                element: page(
                  <AssetDetail />,
                  ["admin", "hardware", "hr"],
                  "asset",
                ),
              },
              {
                path: PATHS.SOFTWARE,
                element: page(
                  <Software />,
                  ["admin", "hardware", "hr"],
                  "software",
                ),
              },
              {
                path: PATHS.SOFTWARE_DETAIL,
                element: page(
                  <SoftwareDetail />,
                  ["admin", "hardware", "hr"],
                  "software",
                ),
              },
              {
                path: PATHS.CREDENTIALS,
                element: page(
                  <Credentials />,
                  ["admin", "hardware"],
                  "credential",
                ),
              },
              {
                path: PATHS.CREDENTIAL_APPROVALS,
                element: page(
                  <CredentialApprovals />,
                  ["admin", "hardware"],
                  "credential",
                ),
              },
              {
                path: PATHS.CREDENTIAL_TYPES,
                element: page(
                  <CredentialTypes />,
                  ["admin"],
                  "credential_type",
                ),
              },
              {
                path: PATHS.CREDENTIAL_REQUESTS,
                element: page(
                  <CredentialRequests />,
                  ["admin", "hardware"],
                  "credential",
                ),
              },
              {
                path: PATHS.CREDENTIAL_ACCESS_LOGS,
                element: page(
                  <CredentialAccessLogs />,
                  ["admin"],
                  "credential_access_log",
                ),
              },
              {
                path: PATHS.REQUESTS,
                element: page(
                  <Requests />,
                  ["admin", "hardware", "hr"],
                  "request",
                ),
              },
              {
                path: PATHS.REQUEST_DETAIL,
                element: page(
                  <RequestDetail />,
                  ["admin", "hardware", "hr"],
                  "request",
                ),
              },
              {
                path: PATHS.AUDIT_LOGS,
                element: page(<AuditLogs />, ["admin"], "audit_log"),
              },
              {
                path: PATHS.DESIGN_SYSTEM,
                element: page(<DesignSystem />, ["admin"]),
              },
              { path: PATHS.PORTAL, element: page(<Portal />, ["employee"]) },
              {
                path: PATHS.PORTAL_ASSETS,
                element: page(<PortalAssets />, ["employee"]),
              },
              {
                path: PATHS.PORTAL_SOFTWARE,
                element: page(<PortalSoftware />, ["employee"]),
              },
              {
                path: PATHS.PORTAL_ACCOUNTS,
                element: page(<PortalAccounts />, ["employee"]),
              },
              {
                path: PATHS.PORTAL_REQUESTS,
                element: page(<PortalRequests />, ["employee"]),
              },
              {
                path: PATHS.PORTAL_REQUEST_DETAIL,
                element: page(<PortalRequestDetail />, ["employee"]),
              },
              {
                path: PATHS.PORTAL_PROFILE,
                element: page(<Profile />, ["employee"]),
              },
              {
                path: PATHS.OFFBOARDING_CASES,
                element: page(
                  <OffboardingCases />,
                  ["admin", "hardware", "hr"],
                  "offboarding_case",
                ),
              },
              {
                path: PATHS.OFFBOARDING_CASE_DETAIL,
                element: page(
                  <OffboardingCaseDetail />,
                  ["admin", "hardware", "hr"],
                  "offboarding_case",
                ),
              },
              {
                path: PATHS.OFFBOARDING_SCAN_RETURNS,
                element: page(
                  <ScanReturns />,
                  ["admin", "hardware"],
                  "offboarding_task",
                ),
              },
              {
                path: PATHS.OFFBOARDING_TEMPLATES,
                element: page(
                  <OffboardingTemplates />,
                  ["admin", "hr"],
                  "offboarding_template",
                ),
              },
              {
                path: PATHS.PORTAL_OFFBOARDING,
                element: page(<PortalOffboarding />, ["employee"]),
              },
              {
                path: PATHS.NOTIFICATION_PREFERENCES,
                element: page(<NotificationPreferences />),
              },
              {
                path: PATHS.VERIFY_DOCUMENT,
                element: (
                  <Suspense fallback={<RouteLoading />}>
                    <VerifyDocument />
                  </Suspense>
                ),
              },
            ],
          },
        ],
      },
      {
        path: PATHS.NOT_FOUND,
        element: (
          <Suspense fallback={<RouteLoading />}>
            <NotFound />
          </Suspense>
        ),
      },
    ],
  },
]);

export function RootRedirect() {
  return <Navigate to={PATHS.ROOT} replace />;
}
