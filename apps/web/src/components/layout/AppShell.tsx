import { useEffect, useMemo, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useTheme } from "next-themes";
import { Command } from "cmdk";
import {
  Bell,
  Building2,
  ChevronDown,
  Command as CommandIcon,
  KeyRound,
  LayoutDashboard,
  Laptop,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  UserRound,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PATHS } from "@/routes/paths";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import useSiteSettingStore from "@/zustand/site-setting";
import type { UserRoleName } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { getModulePermissionApi, normalizePermissions } from "@/api/modules";
import { toast } from "sonner";
import { logoutApi } from "@/api/auth";
import { getUserRole } from "@/lib/roles";
import { callApi } from "@/api/callApi";
import { endPoints } from "@/api/endpoint";

interface NavigationSubItem {
  label: string;
  path: string;
  roles?: UserRoleName[];
  permission?: string;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: typeof Users;
  roles: UserRoleName[];
  group?: string;
  permission?: string;
  children?: NavigationSubItem[];
}

const navigation: NavigationItem[] = [
  {
    label: "Overview",
    path: PATHS.ROOT,
    icon: LayoutDashboard,
    roles: ["admin", "hardware", "hr", "employee"],
  },
  {
    label: "My portal",
    path: PATHS.PORTAL,
    icon: UserRound,
    roles: ["employee"],
    children: [
      {
        label: "Overview",
        path: PATHS.PORTAL,
        roles: ["employee"],
      },
      {
        label: "My assets",
        path: PATHS.PORTAL_ASSETS,
        roles: ["employee"],
      },
      {
        label: "My software",
        path: PATHS.PORTAL_SOFTWARE,
        roles: ["employee"],
      },
      {
        label: "My accounts",
        path: PATHS.PORTAL_ACCOUNTS,
        roles: ["employee"],
      },
    ],
  },
  {
    label: "Employees",
    path: PATHS.EMPLOYEES,
    icon: UsersRound,
    roles: ["admin", "hr"],
    permission: "employee",
  },
  {
    label: "Assets",
    path: PATHS.ASSETS,
    icon: Laptop,
    roles: ["admin", "hardware", "hr"],
    permission: "asset",
    children: [
      {
        label: "All assets",
        path: PATHS.ASSETS,
        roles: ["admin", "hardware", "hr"],
        permission: "asset",
      },
      {
        label: "Unassigned assets",
        path: PATHS.ASSET_UNASSIGNED,
        roles: ["admin", "hardware"],
        permission: "asset",
      },
      {
        label: "Asset categories",
        path: PATHS.ASSET_CATEGORIES,
        roles: ["admin", "hardware"],
        permission: "asset_category",
      },
      {
        label: "Maintenance",
        path: PATHS.ASSET_MAINTENANCE,
        roles: ["admin", "hardware", "hr"],
        permission: "asset_maintenance",
      },
    ],
  },
  {
    label: "Software",
    path: PATHS.SOFTWARE,
    icon: CommandIcon,
    roles: ["admin", "hardware", "hr"],
    permission: "software",
  },
  {
    label: "Credentials",
    path: PATHS.CREDENTIALS,
    icon: KeyRound,
    roles: ["admin", "hardware"],
    permission: "credential",
    children: [
      {
        label: "Credentials",
        path: PATHS.CREDENTIALS,
        roles: ["admin", "hardware"],
        permission: "credential",
      },
      {
        label: "Approvals queue",
        path: PATHS.CREDENTIAL_APPROVALS,
        roles: ["admin", "hardware"],
        permission: "credential",
      },
      {
        label: "Credential types",
        path: PATHS.CREDENTIAL_TYPES,
        roles: ["admin"],
        permission: "credential_type",
      },
      {
        label: "Collection requests",
        path: PATHS.CREDENTIAL_REQUESTS,
        roles: ["admin", "hardware"],
        permission: "credential",
      },
      {
        label: "Vault access audit",
        path: PATHS.CREDENTIAL_ACCESS_LOGS,
        roles: ["admin"],
        permission: "credential_access_log",
      },
    ],
  },
  {
    label: "Organization",
    path: PATHS.DEPARTMENTS,
    icon: Building2,
    roles: ["admin", "hr", "hardware"],
    children: [
      {
        label: "Departments",
        path: PATHS.DEPARTMENTS,
        roles: ["admin", "hr"],
        permission: "department",
      },
      {
        label: "Designations",
        path: PATHS.DESIGNATIONS,
        roles: ["admin", "hr"],
        permission: "designation",
      },
      {
        label: "Locations",
        path: PATHS.LOCATIONS,
        roles: ["admin", "hr"],
        permission: "location",
      },
      {
        label: "Vendors",
        path: PATHS.VENDORS,
        roles: ["admin", "hardware"],
        permission: "vendor",
      },
    ],
  },
  {
    label: "Administration",
    path: PATHS.USERS,
    icon: ShieldCheck,
    roles: ["admin"],
    children: [
      {
        label: "Users",
        path: PATHS.USERS,
        roles: ["admin"],
        permission: "user",
      },
      {
        label: "Roles & access",
        path: PATHS.ROLES,
        roles: ["admin"],
        permission: "role",
      },
      {
        label: "Audit logs",
        path: PATHS.AUDIT_LOGS,
        roles: ["admin"],
        permission: "audit_log",
      },
      {
        label: "Design system",
        path: PATHS.DESIGN_SYSTEM,
        roles: ["admin"],
      },
    ],
  },
];

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const permissions = usePermissionStore((state) => state.modulePermissions);
  const siteName = useSiteSettingStore((state) => state.siteName);
  const setPermissions = usePermissionStore((state) => state.setPermissions);
  const permissionQuery = useQuery({
    queryKey: ["module-permissions"],
    queryFn: async () => {
      const result = await getModulePermissionApi();
      if (!result.ok)
        throw new Error(result.message || "Unable to load permissions");
      return normalizePermissions(result.data ?? []);
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
  useEffect(() => {
    if (permissionQuery.data) setPermissions(permissionQuery.data);
  }, [permissionQuery.data, setPermissions]);
  useEffect(() => {
    if (permissionQuery.error) {
      setPermissions({});
      toast.error(
        `Could not load permissions: ${permissionQuery.error.message}`,
      );
    }
  }, [permissionQuery.error, setPermissions]);
  const role = getUserRole(user);
  const notificationQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const result = await callApi<Array<{ read_at: string | null }>>({
        url: endPoints.notifications,
        method: "GET",
      });
      if (!result.ok)
        throw new Error(result.message || "Unable to load notifications");
      return result.data ?? [];
    },
    enabled: Boolean(user) && role !== "employee",
    refetchInterval: 60_000,
  });
  const unreadNotificationCount =
    notificationQuery.data?.filter((item) => !item.read_at).length ?? 0;
  const visibleNavigation = useMemo(
    () =>
      navigation
        .map((item) => {
          if (!item.roles.includes(role)) return null;
          if (
            item.permission &&
            role !== "admin" &&
            !permissions[item.permission]?.read_access
          ) {
            return null;
          }
          if (item.children) {
            const filteredChildren = item.children.filter((child) => {
              if (child.roles && !child.roles.includes(role)) return false;
              if (
                child.permission &&
                role !== "admin" &&
                !permissions[child.permission]?.read_access
              ) {
                return false;
              }
              return true;
            });
            if (filteredChildren.length === 0) return null;
            return { ...item, children: filteredChildren };
          }
          return item;
        })
        .filter((item): item is NavigationItem => item !== null),
    [permissions, role],
  );

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    visibleNavigation.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some(
          (c) =>
            location.pathname === c.path ||
            (c.path !== "/" && location.pathname.startsWith(c.path)),
        );
        if (isChildActive) {
          setOpenSubmenus((prev) => ({ ...prev, [item.label]: true }));
        }
      }
    });
  }, [location.pathname, visibleNavigation]);

  const currentLabel = useMemo(() => {
    for (const item of navigation) {
      if (item.children) {
        const matchingChild = item.children.find(
          (c) => c.path === location.pathname,
        );
        if (matchingChild) return matchingChild.label;
      }
      if (item.path === location.pathname) return item.label;
    }
    return "Employee";
  }, [location.pathname]);
  const handleLogout = async () => {
    const result = await logoutApi();
    if (!result.ok && result.status !== 401) {
      toast.error(
        `Your local session ended, but server sign-out failed: ${result.message}`,
      );
    }
    logout();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const Sidebar = ({
    onNavigate,
    forceExpanded = false,
  }: {
    onNavigate?: () => void;
    forceExpanded?: boolean;
  }) => {
    const isCollapsed = collapsed && !forceExpanded;
    return (
      <div className="flex h-full flex-col bg-card select-none">
        {/* Header */}
        <div className="flex h-[68px] shrink-0 items-center justify-between border-b px-5">
          <Link
            to={PATHS.ROOT}
            onClick={onNavigate}
            className="flex items-center gap-2.5 font-semibold tracking-tight"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-xs">
              IT
            </span>
            {!isCollapsed && (
              <span className="truncate text-sm font-bold tracking-tight text-foreground">
                {siteName}
                <span className="ml-0.5 text-primary">.</span>
              </span>
            )}
          </Link>
          <button
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground lg:block"
            onClick={() => setCollapsed((value) => !value)}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 -rotate-90 transition-transform duration-200",
                isCollapsed && "rotate-90",
              )}
            />
          </button>
          <button
            aria-label="Close navigation"
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {!isCollapsed && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground/80">
              Workspace
            </p>
          )}
          <nav aria-label="Main navigation" className="space-y-1">
            {visibleNavigation.map((item, index) => {
              const prevGroup = visibleNavigation[index - 1]?.group;
              const isNewGroup = item.group && prevGroup !== item.group;
              const hasChildren = Boolean(
                item.children && item.children.length > 0,
              );
              const isParentOpen = openSubmenus[item.label] ?? false;
              const isChildActive =
                hasChildren &&
                item.children!.some(
                  (c) =>
                    location.pathname === c.path ||
                    (c.path !== "/" &&
                      location.pathname.startsWith(c.path + "/")),
                );

              return (
                <div key={item.path || item.label}>
                  {isNewGroup && (
                    <>
                      {isCollapsed ? (
                        <div className="my-2 border-t border-border/50" />
                      ) : (
                        <p className="mb-1.5 mt-5 px-3 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground/80">
                          {item.group}
                        </p>
                      )}
                    </>
                  )}

                  {hasChildren ? (
                    <div>
                      {isCollapsed ? (
                        <NavLink
                          to={item.path}
                          onClick={onNavigate}
                          title={item.label}
                          className={cn(
                            "group relative flex min-h-10 items-center justify-center rounded-lg px-0 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                            isChildActive &&
                              "bg-primary/10 font-semibold text-primary dark:bg-primary/20",
                          )}
                        >
                          <item.icon className="mx-auto h-[18px] w-[18px] shrink-0 transition-transform duration-150 group-hover:scale-105" />
                        </NavLink>
                      ) : (
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenSubmenus((prev) => ({
                                ...prev,
                                [item.label]: !prev[item.label],
                              }))
                            }
                            className={cn(
                              "group flex w-full min-h-10 items-center justify-between rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                              isChildActive && "font-semibold text-foreground",
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <item.icon className="h-[18px] w-[18px] shrink-0 transition-transform duration-150 group-hover:scale-105" />
                              <span className="truncate">{item.label}</span>
                            </div>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 shrink-0 transition-transform duration-200",
                                !isParentOpen && "-rotate-90",
                              )}
                            />
                          </button>
                          {isParentOpen && (
                            <div className="ml-5 mt-1 space-y-1 border-l border-border/60 pl-3">
                              {item.children!.map((child) => {
                                const active =
                                  location.pathname === child.path ||
                                  (child.path !== "/" &&
                                    location.pathname.startsWith(
                                      child.path + "/",
                                    ) &&
                                    !item.children!.some(
                                      (other) =>
                                        other.path !== child.path &&
                                        other.path.length > child.path.length &&
                                        location.pathname.startsWith(
                                          other.path,
                                        ),
                                    ));
                                return (
                                  <NavLink
                                    key={child.path}
                                    to={child.path}
                                    end
                                    onClick={onNavigate}
                                    className={cn(
                                      "flex min-h-8 items-center gap-2 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                                      active &&
                                        "bg-primary/10 font-semibold text-primary dark:bg-primary/20",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "h-1.5 w-1.5 rounded-full transition-colors",
                                        active
                                          ? "bg-primary"
                                          : "bg-muted-foreground/40",
                                      )}
                                    />
                                    <span className="truncate">
                                      {child.label}
                                    </span>
                                  </NavLink>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={
                        item.path === PATHS.ROOT ||
                        item.path === PATHS.PORTAL ||
                        item.path === PATHS.ASSETS
                      }
                      onClick={onNavigate}
                      title={isCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                          isActive &&
                            "bg-primary/10 font-semibold text-primary dark:bg-primary/20",
                          isCollapsed && "justify-center px-0",
                        )
                      }
                    >
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-transform duration-150 group-hover:scale-105",
                          isCollapsed && "mx-auto",
                        )}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </NavLink>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer with user info */}
        <div className="shrink-0 border-t p-3">
          <NavLink
            to={PATHS.PROFILE}
            onClick={onNavigate}
            title={
              isCollapsed
                ? `${user?.first_name || ""} ${user?.last_name || ""}`.trim()
                : undefined
            }
            className={({ isActive }) =>
              cn(
                "flex min-h-12 items-center gap-3 rounded-lg px-2.5 transition-colors hover:bg-muted",
                isActive && "bg-muted font-semibold",
                isCollapsed && "justify-center px-0",
              )
            }
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary shadow-xs">
              {user?.first_name?.[0] ?? "U"}
              {user?.last_name?.[0] ?? ""}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {user
                    ? `${user.first_name} ${user.last_name ?? ""}`.trim()
                    : "Workspace user"}
                </p>
                <p className="truncate text-[11px] capitalize text-muted-foreground">
                  {role}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <span
                aria-hidden="true"
                className="rounded p-1 text-muted-foreground"
              >
                <ChevronDown className="h-4 w-4" />
              </span>
            )}
          </NavLink>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r bg-card transition-all duration-200 ease-in-out lg:block",
          collapsed ? "w-[72px]" : "w-[260px]",
        )}
      >
        <Sidebar />
      </aside>
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent
          hideClose
          className="fixed inset-y-0 left-0 z-50 h-full max-h-none w-[280px] max-w-[85vw] -translate-x-0 -translate-y-0 rounded-none border-r border-border bg-card p-0 shadow-2xl focus:outline-none"
        >
          <DialogTitle className="sr-only">Workspace navigation</DialogTitle>
          <Sidebar onNavigate={() => setMobileOpen(false)} forceExpanded />
        </DialogContent>
      </Dialog>
      <main
        className={cn(
          "min-h-screen transition-all duration-200 ease-in-out",
          collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]",
        )}
      >
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b bg-background/85 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation"
              className="rounded-md p-2 hover:bg-muted lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span>Workspace</span>
              <span>/</span>
              <span className="font-medium text-foreground">
                {currentLabel}
              </span>
            </div>
            <span className="font-semibold lg:hidden">{siteName}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label="Open search"
              className="h-9 justify-start gap-2 px-2.5 text-muted-foreground sm:w-52 sm:justify-between sm:px-3"
              onClick={() => setPaletteOpen(true)}
            >
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search anything</span>
              </span>
              <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] sm:inline-flex">
                <CommandIcon className="h-3 w-3" /> K
              </kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              onClick={() => navigate(PATHS.NOTIFICATIONS)}
              className="relative"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-semibold text-white ring-2 ring-background">
                  {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-[18px] w-[18px]" />
              ) : (
                <Moon className="h-[18px] w-[18px]" />
              )}
            </Button>
            <div className="relative">
              <button
                aria-label="Open user menu"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                onClick={() => setProfileOpen((value) => !value)}
              >
                {user?.first_name?.[0] ?? "U"}
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-11 z-30 w-44 rounded-lg border bg-card p-1 shadow-xl">
                  <Link
                    to={PATHS.PROFILE}
                    className="block rounded px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => setProfileOpen(false)}
                  >
                    Profile settings
                  </Link>
                  <button
                    className="w-full rounded px-3 py-2 text-left text-sm text-danger hover:bg-muted"
                    onClick={() => void handleLogout()}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8">
          <Outlet />
        </div>
      </main>
      <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <DialogContent className="overflow-hidden p-0">
          <DialogTitle className="sr-only">Quick navigation</DialogTitle>
          <Command className="rounded-xl">
            <div className="flex items-center border-b px-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Command.Input
                autoFocus
                placeholder="Search pages..."
                className="h-12 flex-1 bg-transparent px-3 text-sm outline-none"
              />
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="p-5 text-center text-sm text-muted-foreground">
                No pages found.
              </Command.Empty>
              {visibleNavigation
                .flatMap((item) =>
                  item.children
                    ? item.children.map((child) => ({
                        label: `${item.label} > ${child.label}`,
                        path: child.path,
                        icon: item.icon,
                      }))
                    : [{ label: item.label, path: item.path, icon: item.icon }],
                )
                .map((entry) => (
                  <Command.Item
                    key={entry.path}
                    value={entry.label}
                    onSelect={() => {
                      navigate(entry.path);
                      setPaletteOpen(false);
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <entry.icon className="h-4 w-4" />
                    {entry.label}
                  </Command.Item>
                ))}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}
