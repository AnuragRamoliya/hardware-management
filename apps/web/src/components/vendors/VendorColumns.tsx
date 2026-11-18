import { Pencil, Trash2 } from "lucide-react";
import type { TableColumn } from "@/components/common/CommonTable";
import { RowActionsMenu } from "@/components/common/RowActionsMenu";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { VendorRecord } from "@/hooks/queries/vendors";

export interface VendorColumnActions {
  onEdit: (vendor: VendorRecord) => void;
  onDelete: (vendor: VendorRecord) => void;
  canWrite?: boolean;
  canDelete?: boolean;
}

export function getVendorColumns(
  actions: VendorColumnActions,
): TableColumn<VendorRecord>[] {
  return [
    {
      id: "name",
      label: "Vendor",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-foreground">{row.name}</span>
          {row.contact_name && (
            <p className="text-xs text-muted-foreground">{row.contact_name}</p>
          )}
        </div>
      ),
    },
    {
      id: "email",
      label: "Email",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.email || "—"}
        </span>
      ),
    },
    {
      id: "phone",
      label: "Phone",
      sortable: false,
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.phone || "—"}
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
        if (menuActions.length === 0) return null;
        return <RowActionsMenu label="Vendor actions" actions={menuActions} />;
      },
    },
  ];
}
