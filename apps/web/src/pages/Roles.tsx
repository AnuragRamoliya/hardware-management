import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, ShieldCheck } from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/common/Drawer";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/common/States";
import {
  useRolesList,
  useRolePermissions,
  useModulesList,
  useSaveRole,
  type RoleRecord,
} from "@/hooks/queries/roles";
import { useTableState } from "@/hooks/use-tableState";
import type { PermissionSet } from "@/types";
import { RECORD_STATUS_FILTER } from "@/components/common/TableSelectFilter";
import type { TableColumn } from "@/components/common/CommonTable";

const emptyPermission = (): PermissionSet => ({
  read_access: false,
  write_access: false,
  delete_access: false,
  approve_access: false,
  reveal_access: false,
});

const accessIsEnabled = (value: boolean | number | string) =>
  value === true || value === 1 || value === "1";

export function RolesPage() {
  const { tableState, setTableState } = useTableState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<RoleRecord | null>(null);
  const [name, setName] = useState("");
  const [roleType, setRoleType] = useState("");
  const [matrix, setMatrix] = useState<Record<string, PermissionSet>>({});

  const {
    data: rolesData,
    isLoading: isRolesLoading,
    error: rolesError,
    refetch: refetchRoles,
  } = useRolesList(tableState);

  const permissionsQuery = useRolePermissions(
    selected?.id ?? "",
    Boolean(selected && dialogOpen),
  );

  const modulesQuery = useModulesList();
  const saveMutation = useSaveRole();

  useEffect(() => {
    if (!selected || !permissionsQuery.data) return;
    setMatrix(
      Object.fromEntries(
        permissionsQuery.data.flatMap((permission) =>
          permission.module?.name
            ? [
                [
                  permission.module.name,
                  {
                    read_access: accessIsEnabled(permission.read_access),
                    write_access: accessIsEnabled(permission.write_access),
                    delete_access: accessIsEnabled(permission.delete_access),
                    approve_access: accessIsEnabled(
                      (
                        permission as unknown as Record<
                          string,
                          boolean | number | string
                        >
                      ).approve_access ?? false,
                    ),
                    reveal_access: accessIsEnabled(
                      (
                        permission as unknown as Record<
                          string,
                          boolean | number | string
                        >
                      ).reveal_access ?? false,
                    ),
                  },
                ],
              ]
            : [],
        ),
      ),
    );
  }, [permissionsQuery.data, selected]);

  const columns = useMemo<TableColumn<RoleRecord>[]>(
    () => [
      {
        id: "name",
        label: "Role",
        sortable: true,
        render: (row) => (
          <div>
            <span className="font-medium text-foreground">{row.name}</span>
            {row.description && (
              <p className="text-xs text-muted-foreground">{row.description}</p>
            )}
          </div>
        ),
      },
      {
        id: "type",
        label: "Role type",
        sortable: true,
        render: (row) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.type || "—"}
          </span>
        ),
      },
      {
        id: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              setSelected(row);
              setName(row.name);
              setRoleType(row.type ?? "");
              setMatrix({});
              setDialogOpen(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit access
          </Button>
        ),
      },
    ],
    [],
  );

  const openNew = () => {
    setSelected(null);
    setName("");
    setRoleType("");
    setMatrix({});
    setDialogOpen(true);
  };

  const toggle = (moduleName: string, key: keyof PermissionSet) =>
    setMatrix((current) => {
      const next = {
        ...emptyPermission(),
        ...current[moduleName],
        [key]: !current[moduleName]?.[key],
      };
      if (key === "read_access" && !next.read_access) {
        next.write_access = false;
        next.delete_access = false;
        next.approve_access = false;
        next.reveal_access = false;
      }
      return { ...current, [moduleName]: next };
    });

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      selectedId: selected?.id,
      name,
      roleType,
      modules: modulesQuery.data ?? [],
      matrix,
    });
    setDialogOpen(false);
  };

  return (
    <>
      <ListPageScaffold<RoleRecord>
        title="Roles & access"
        description="Create roles and define exactly which areas they can view, edit, or manage."
        breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Roles" }]}
        action={
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Create role
          </Button>
        }
        columns={columns}
        filterFields={[RECORD_STATUS_FILTER]}
        rows={(rolesData?.rows as RoleRecord[]) ?? []}
        count={rolesData?.count ?? 0}
        query={tableState}
        onQueryChange={setTableState}
        loading={isRolesLoading}
        error={rolesError instanceof Error ? rolesError.message : undefined}
        onRetry={refetchRoles}
        emptyTitle="No roles found"
      />

      <Drawer
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selected ? "Edit role access" : "Create role"}
        description="Select the permissions this role needs. Write and delete require read access."
        className="sm:max-w-3xl"
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="role-name"
              className="mb-2 block text-sm font-medium"
            >
              Role name
            </label>
            <Input
              id="role-name"
              value={name}
              onChange={(event) => {
                const value = event.target.value;
                setName(value);
                if (!selected) {
                  setRoleType(
                    value
                      .trim()
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "_"),
                  );
                }
              }}
              placeholder="e.g. IT support"
            />
          </div>
          {!selected && (
            <div>
              <label
                htmlFor="role-type"
                className="mb-2 block text-sm font-medium"
              >
                Role type
              </label>
              <Input
                id="role-type"
                value={roleType}
                onChange={(event) => setRoleType(event.target.value)}
                placeholder="e.g. it_support"
              />
            </div>
          )}
          {modulesQuery.isError && (
            <p role="alert" className="text-sm text-danger">
              Could not load modules:{" "}
              {modulesQuery.error instanceof Error
                ? modulesQuery.error.message
                : "Unknown error"}
            </p>
          )}
          {permissionsQuery.isError && selected && (
            <p role="alert" className="text-sm text-danger">
              Could not load this role's permissions:{" "}
              {permissionsQuery.error instanceof Error
                ? permissionsQuery.error.message
                : "Unknown error"}
            </p>
          )}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-muted/70 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3 text-center">View</th>
                  <th className="px-4 py-3 text-center">Create & edit</th>
                  <th className="px-4 py-3 text-center">Delete</th>
                  <th className="px-4 py-3 text-center">Approve</th>
                  <th className="px-4 py-3 text-center">Reveal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {modulesQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-5">
                      <Spinner label="Loading modules" />
                    </td>
                  </tr>
                ) : (
                  modulesQuery.data?.map((module) => (
                    <tr key={module.id}>
                      <td className="px-4 py-3 font-medium capitalize">
                        {module.name.replaceAll("_", " ")}
                      </td>
                      {(
                        [
                          "read_access",
                          "write_access",
                          "delete_access",
                          "approve_access",
                          "reveal_access",
                        ] as const
                      ).map((permission) => (
                        <td key={permission} className="px-4 py-3 text-center">
                          <Checkbox
                            aria-label={`${permission.replace("_access", "")} ${module.name}`}
                            checked={matrix[module.name]?.[permission] ?? false}
                            disabled={
                              permission !== "read_access" &&
                              !matrix[module.name]?.read_access
                            }
                            onChange={() => toggle(module.name, permission)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-accent p-4 text-sm text-accent-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Permissions are checked in both navigation and route guards. The
              seeded Super Admin role has full access.
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              disabled={
                !name.trim() ||
                (!selected && !roleType.trim()) ||
                modulesQuery.isLoading ||
                modulesQuery.isError ||
                (Boolean(selected) &&
                  (permissionsQuery.isLoading || permissionsQuery.isError)) ||
                saveMutation.isPending
              }
              loading={saveMutation.isPending}
              onClick={handleSave}
            >
              Save permissions
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
