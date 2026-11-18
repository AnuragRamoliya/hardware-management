import type { TableColumn } from "@/components/common/CommonTable";
import { RowActionsMenu } from "@/components/common/RowActionsMenu";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { LocationRecord } from "@/hooks/queries/locations";

export interface LocationColumnActions {
  onEdit: (location: LocationRecord) => void;
  onDelete: (location: LocationRecord) => void;
  canWrite?: boolean;
  canDelete?: boolean;
}

export function getLocationColumns(
  actions: LocationColumnActions,
): TableColumn<LocationRecord>[] {
  return [
    {
      id: "name",
      label: "Location",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-foreground">{row.name}</span>
        </div>
      ),
    },
    {
      id: "address",
      label: "Address",
      sortable: false,
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.address || "—"}
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
          <RowActionsMenu label="Location actions" actions={menuActions} />
        );
      },
    },
  ];
}
