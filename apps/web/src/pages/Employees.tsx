import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Upload } from "lucide-react";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import { useFormDrawer } from "@/hooks/useFormDrawer";
import {
  useEmployeesList,
  useEmployee,
  useDeleteEmployee,
  type EmployeeRecord,
} from "@/hooks/queries/employee";
import { getEmployeeColumns } from "@/components/employees/EmployeeColumns";
import { employeeFilters } from "@/components/employees/EmployeeFilters";
import { AddEditEmployee } from "@/components/employees/AddEditEmployee";
import { EmployeeImportDialog } from "@/components/employees/EmployeeImportDialog";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";
import { PATHS } from "@/routes/paths";

export function Employees() {
  const navigate = useNavigate();
  const { tableState, setTableState } = useTableState(10);
  const { isOpen, editingItem, openCreate, openEdit, setIsOpen } =
    useFormDrawer<EmployeeRecord>();
  const [deletingItem, setDeletingItem] = useState<EmployeeRecord | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const role = useAuthStore((state) => getUserRole(state.user));
  const permissions = usePermissionStore(
    (state) => state.modulePermissions.employee,
  );
  const canWrite = role === "admin" || permissions?.write_access === true;
  const canDelete = role === "admin" || permissions?.delete_access === true;

  const { data, isLoading, error, refetch } = useEmployeesList(tableState);
  const deleteMutation = useDeleteEmployee();

  const activeEmployeeId = editingItem?.id;
  const { data: fullEmployee, isLoading: isFetchingDetail } = useEmployee(
    activeEmployeeId ?? "",
    Boolean(activeEmployeeId),
  );

  const columns = useMemo(
    () =>
      getEmployeeColumns({
        onView: (emp) =>
          navigate(PATHS.EMPLOYEE_DETAIL.replace(":id", String(emp.id))),
        onEdit: openEdit,
        onDelete: setDeletingItem,
        canWrite,
        canDelete,
      }),
    [navigate, openEdit, canWrite, canDelete],
  );

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    await deleteMutation.mutateAsync(deletingItem.id);
    setDeletingItem(null);
  };

  return (
    <>
      <ListPageScaffold
        title="Employees"
        description="Manage your people, roles, and employee records from one place."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Employees" },
        ]}
        action={
          canWrite ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setImportOpen(true)}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Add employee
              </Button>
            </div>
          ) : undefined
        }
        columns={columns}
        rows={(data?.rows as EmployeeRecord[]) ?? []}
        count={data?.count ?? 0}
        query={tableState}
        onQueryChange={setTableState}
        loading={isLoading}
        error={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
        filterFields={employeeFilters}
        onRowClick={(row) =>
          navigate(PATHS.EMPLOYEE_DETAIL.replace(":id", String(row.id)))
        }
        emptyTitle="No employees found"
      />

      <AddEditEmployee
        open={isOpen}
        onOpenChange={setIsOpen}
        employee={fullEmployee || editingItem}
        loading={isFetchingDetail}
      />

      <EmployeeImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Delete employee"
        description={`Are you sure you want to delete "${deletingItem?.first_name} ${deletingItem?.last_name || ""}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
