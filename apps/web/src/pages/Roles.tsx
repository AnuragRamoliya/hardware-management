import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Pencil, Plus, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { CommonTable, type TableColumn } from "@/components/common/CommonTable";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState, Spinner } from "@/components/common/States";
import {
  getRoleListApi,
  addRoleApi,
  updateRoleApi,
  getRolePermissionsApi,
  setRolePermissionsApi,
} from "@/api/roles";
import { getModuleListApi } from "@/api/modules";
import { useTableState } from "@/hooks/use-tableState";
import type { PermissionSet, Role } from "@/types";
import { RECORD_STATUS_FILTER } from "@/components/common/TableSelectFilter";

type RoleRow = Role & { users_count?: number };
const emptyPermission = (): PermissionSet => ({
  read_access: false,
  write_access: false,
  delete_access: false,
});
const accessIsEnabled = (value: boolean | number | string) =>
  value === true || value === 1 || value === "1";

export function RolesPage() {
  const { tableState, setTableState } = useTableState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<RoleRow | null>(null);
  const [name, setName] = useState("");
  const [roleType, setRoleType] = useState("");
  const [matrix, setMatrix] = useState<Record<string, PermissionSet>>({});
  const client = useQueryClient();
  const rolesQuery = useQuery({
    queryKey: ["roles", tableState],
    queryFn: async () => {
      const result = await getRoleListApi(tableState);
      if (!result.ok) throw new Error(result.message);
      return result.data ?? { rows: [], count: 0 };
    },
  });
  const permissionsQuery = useQuery({
    queryKey: ["role-permissions", selected?.id],
    queryFn: async () => {
      if (!selected) return [];
      const result = await getRolePermissionsApi(selected.id);
      if (!result.ok) throw new Error(result.message);
      return result.data ?? [];
    },
    enabled: Boolean(selected && dialogOpen),
  });
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
                  },
                ],
              ]
            : [],
        ),
      ),
    );
  }, [permissionsQuery.data, selected]);
  const modulesQuery = useQuery({
    queryKey: ["modules"],
    queryFn: async () => {
      const result = await getModuleListApi({
        currentPage: 1,
        itemsPerPage: 100,
        filters: {},
        sortBy: [],
        general_search: "",
      });
      if (!result.ok) throw new Error(result.message);
      return result.data?.rows ?? [];
    },
  });
  const save = useMutation({
    mutationFn: async () => {
      const response = selected
        ? await updateRoleApi({ id: selected.id, name })
        : await addRoleApi({
            name,
            type: roleType,
          });
      if (!response.ok) throw new Error(response.message);
      const roleId = selected?.id ?? response.data?.id;
      if (!roleId)
        throw new Error("The server did not return the saved role ID.");
      const permissionsResponse = await setRolePermissionsApi(
        roleId,
        (modulesQuery.data ?? []).map((module) => ({
          module_id: module.id,
          read_access: matrix[module.name]?.read_access ?? false,
          write_access: matrix[module.name]?.write_access ?? false,
          delete_access: matrix[module.name]?.delete_access ?? false,
        })),
      );
      if (!permissionsResponse.ok) throw new Error(permissionsResponse.message);
      return response;
    },
    onSuccess: async (result) => {
      toast.success(result.message || "Role saved");
      setDialogOpen(false);
      await client.invalidateQueries({ queryKey: ["roles"] });
      await client.invalidateQueries({ queryKey: ["role-permissions"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const columns = useMemo<TableColumn<RoleRow>[]>(
    () => [
      {
        id: "name",
        label: "Role",
        render: (row) => <span className="font-medium">{row.name}</span>,
      },
      { id: "type", label: "Role type" },
      {
        id: "actions",
        label: "",
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
      }
      return { ...current, [moduleName]: next };
    });

  return (
    <>
      <PageHeader
        title="Roles & access"
        description="Create roles and define exactly which areas they can view, edit, or manage."
        breadcrumbs={[{ label: "Roles" }]}
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            Create role
          </Button>
        }
      />
      <CommonTable<RoleRow>
        columns={columns}
        filterFields={[RECORD_STATUS_FILTER]}
        rows={rolesQuery.data?.rows ?? []}
        count={rolesQuery.data?.count ?? 0}
        query={tableState}
        onQueryChange={setTableState}
        loading={rolesQuery.isLoading}
        error={rolesQuery.error?.message}
        onRetry={() => void rolesQuery.refetch()}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl p-0">
          <div className="border-b p-6">
            <DialogTitle className="text-lg font-semibold">
              {selected ? "Edit role access" : "Create role"}
            </DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Select the permissions this role needs. Write and delete require
              read access.
            </p>
          </div>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
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
                Could not load modules: {modulesQuery.error.message}
              </p>
            )}
            {permissionsQuery.isError && selected && (
              <p role="alert" className="text-sm text-danger">
                Could not load this role's permissions:{" "}
                {permissionsQuery.error.message}
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
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {modulesQuery.isLoading ? (
                    <tr>
                      <td colSpan={4} className="p-5">
                        <Spinner />
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
                          ] as const
                        ).map((permission) => (
                          <td
                            key={permission}
                            className="px-4 py-3 text-center"
                          >
                            <input
                              aria-label={`${permission.replace("_access", "")} ${module.name}`}
                              type="checkbox"
                              checked={
                                matrix[module.name]?.[permission] ?? false
                              }
                              disabled={
                                permission !== "read_access" &&
                                !matrix[module.name]?.read_access
                              }
                              className="h-4 w-4 accent-primary disabled:opacity-40"
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
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={
                  !name.trim() ||
                  (!selected && !roleType.trim()) ||
                  modulesQuery.isLoading ||
                  modulesQuery.isError ||
                  (Boolean(selected) &&
                    (permissionsQuery.isLoading || permissionsQuery.isError))
                }
                loading={save.isPending}
                onClick={() => save.mutate()}
              >
                {selected ? "Save role" : "Create role"}
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RolesEmptyState() {
  return (
    <Card>
      <EmptyState
        title="No roles configured"
        description="Create a role to define a group of permissions."
      />
    </Card>
  );
}
