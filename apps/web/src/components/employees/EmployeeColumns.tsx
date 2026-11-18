import { Link } from "react-router-dom";
import { Eye, Pencil, Trash2 } from "lucide-react";
import type { TableColumn } from "@/components/common/CommonTable";
import {
  RowActionsMenu,
  type RowAction,
} from "@/components/common/RowActionsMenu";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ReferenceLabel } from "@/components/common/ReferenceLabel";
import { Badge } from "@/components/ui/badge";
import { ENUMS } from "@/utils/constants";
import { PATHS } from "@/routes/paths";
import type { EmployeeRecord } from "@/hooks/queries/employee";

export interface EmployeeColumnActions {
  onView: (employee: EmployeeRecord) => void;
  onEdit: (employee: EmployeeRecord) => void;
  onDelete: (employee: EmployeeRecord) => void;
  canWrite?: boolean;
  canDelete?: boolean;
}

export function getEmployeeColumns(
  actions: EmployeeColumnActions,
): TableColumn<EmployeeRecord>[] {
  return [
    {
      id: "employee_code",
      label: "Employee ID",
      sortable: true,
      render: (row) => (
        <Link
          to={PATHS.EMPLOYEE_DETAIL.replace(":id", String(row.id))}
          className="font-medium text-primary hover:underline"
        >
          {row.employee_code ?? `EMP-${row.id}`}
        </Link>
      ),
    },
    {
      id: "first_name",
      label: "Employee",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-foreground">
            {row.first_name} {row.last_name || ""}
          </span>
        </div>
      ),
    },
    {
      id: "email",
      label: "Work email",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.email}</span>
      ),
    },
    {
      id: "department_id",
      label: "Department",
      sortable: true,
      render: (row) => (
        <ReferenceLabel
          id={row.department_id}
          endpoint="department/options"
          relation={row.department}
        />
      ),
    },
    {
      id: "designation_id",
      label: "Designation",
      sortable: true,
      render: (row) => (
        <ReferenceLabel
          id={row.designation_id}
          endpoint="designation/options"
          relation={row.designation}
        />
      ),
    },
    {
      id: "employment_status",
      label: "Employment",
      sortable: true,
      render: (row) => {
        const option = ENUMS.employmentStatus.find(
          (o) => String(o.value) === String(row.employment_status ?? 1),
        );
        return (
          <Badge variant={option?.tone === "success" ? "success" : "muted"}>
            {option?.label ?? "Active"}
          </Badge>
        );
      },
    },
    {
      id: "status",
      label: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      label: "Actions",
      sortable: false,
      render: (row) => {
        const menuActions: RowAction[] = [
          {
            key: "view",
            label: "View profile",
            icon: Eye,
            onSelect: () => actions.onView(row),
          },
        ];
        if (actions.canWrite !== false) {
          menuActions.push({
            key: "edit",
            label: "Edit",
            icon: Pencil,
            onSelect: () => actions.onEdit(row),
          });
        }
        if (actions.canDelete !== false) {
          menuActions.push({
            key: "delete",
            label: "Delete",
            icon: Trash2,
            destructive: true,
            separatorBefore: true,
            onSelect: () => actions.onDelete(row),
          });
        }
        return (
          <RowActionsMenu label="Employee actions" actions={menuActions} />
        );
      },
    },
  ];
}
