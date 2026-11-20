import { Pencil, Trash2 } from "lucide-react";
import type { TableColumn } from "@/components/common/CommonTable";
import { RowActionsMenu } from "@/components/common/RowActionsMenu";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { AssetCategoryRecord } from "@/hooks/queries/assetCategories";

export interface AssetCategoryColumnActions {
  onEdit: (category: AssetCategoryRecord) => void;
  onDelete: (category: AssetCategoryRecord) => void;
  canWrite?: boolean;
  canDelete?: boolean;
}

export function getAssetCategoryColumns(
  actions: AssetCategoryColumnActions,
): TableColumn<AssetCategoryRecord>[] {
  return [
    {
      id: "name",
      label: "Category",
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
      id: "assets_count",
      label: "Assets",
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {row.assets_count ?? 0}
        </span>
      ),
    },
    {
      id: "status",
      label: "Status",
      sortable: true,
      render: (row) => (
        <StatusBadge status={row.status === 1 ? "active" : "inactive"} />
      ),
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
        return (
          <RowActionsMenu label="Category actions" actions={menuActions} />
        );
      },
    },
  ];
}
