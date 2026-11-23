import type { TableColumn } from "@/components/common/CommonTable";
import { RowActionsMenu } from "@/components/common/RowActionsMenu";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ReferenceLabel } from "@/components/common/ReferenceLabel";
import type { UserRecord } from "@/hooks/queries/users";

export interface UserColumnActions {
  onEdit: (user: UserRecord) => void;
  onDelete: (user: UserRecord) => void;
  canWrite?: boolean;
  canDelete?: boolean;
}

export function getUserColumns(
  actions: UserColumnActions,
): TableColumn<UserRecord>[] {
  return [
    {
      id: "first_name",
      label: "Name",
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
      label: "Email",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.email}</span>
      ),
    },
    {
      id: "role_id",
      label: "Role",
      sortable: true,
      render: (row) => (
        <ReferenceLabel
          id={row.role_id}
          endpoint="role/options"
          relation={row.role}
        />
      ),
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
        const menuActions = [];
        if (actions.canWrite !== false) {
          menuActions.push({
            label: "Edit",
            onSelect: () => actions.onEdit(row),
          });
        }
        if (actions.canDelete !== false) {
          menuActions.push({
            label: "Delete",
            destructive: true,
            onSelect: () => actions.onDelete(row),
          });
        }
        if (menuActions.length === 0) return null;
        return <RowActionsMenu label="User actions" actions={menuActions} />;
      },
    },
  ];
}
