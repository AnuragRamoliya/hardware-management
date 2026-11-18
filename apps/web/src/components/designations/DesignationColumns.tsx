import type { TableColumn } from "@/components/common/CommonTable";
import { RowActionsMenu } from "@/components/common/RowActionsMenu";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { DesignationRecord } from "@/hooks/queries/designations";

export interface DesignationColumnActions {
  onEdit: (designation: DesignationRecord) => void;
  onDelete: (designation: DesignationRecord) => void;
  canWrite?: boolean;
  canDelete?: boolean;
}

export function getDesignationColumns(
  actions: DesignationColumnActions,
): TableColumn<DesignationRecord>[] {
  return [
    {
      id: "name",
      label: "Designation",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-foreground">{row.name}</span>
        </div>
      ),
    },
    {
      id: "description",
      label: "Description",
      sortable: false,
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.description || "—"}
        </span>
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
        return (
          <RowActionsMenu label="Designation actions" actions={menuActions} />
        );
      },
    },
  ];
}
