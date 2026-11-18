import { Pencil, Trash2 } from "lucide-react";
import type { TableColumn } from "@/components/common/CommonTable";
import {
  RowActionsMenu,
  type RowAction,
} from "@/components/common/RowActionsMenu";
import { Badge } from "@/components/ui/badge";
import type { CredentialTypeDto } from "@/api/credentials";

export interface CredentialTypeColumnActions {
  onEdit: (type: CredentialTypeDto) => void;
  onDelete: (type: CredentialTypeDto) => void;
  canWrite?: boolean;
  canDelete?: boolean;
}

export function getCredentialTypeColumns(
  actions: CredentialTypeColumnActions,
): TableColumn<CredentialTypeDto>[] {
  const { onEdit, onDelete, canWrite = true, canDelete = true } = actions;

  return [
    {
      id: "name",
      label: "Type Name",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-foreground">{row.name}</span>
          {row.notes && (
            <p className="text-xs text-muted-foreground">{row.notes}</p>
          )}
        </div>
      ),
    },
    {
      id: "category",
      label: "Category",
      sortable: true,
      render: (row) => (
        <Badge variant="outline" className="capitalize">
          {row.category.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      id: "policy",
      label: "Password Policy",
      sortable: false,
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div>Min length: {row.min_length} chars</div>
          <div className="text-muted-foreground">
            Complexity: {row.require_complexity ? "Enforced" : "Standard"}
          </div>
        </div>
      ),
    },
    {
      id: "expiry_days",
      label: "Expiry Policy",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.expiry_days ? `${row.expiry_days} days` : "No expiry"}
        </span>
      ),
    },
    {
      id: "flags",
      label: "Rules",
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2 text-xs">
          {row.requires_approval ? (
            <Badge variant="warning" className="text-[10px]">
              Requires Approval
            </Badge>
          ) : (
            <Badge variant="muted" className="text-[10px]">
              Auto-Approved
            </Badge>
          )}
          {row.allow_employee_submit && (
            <Badge variant="outline" className="text-[10px]">
              Employee Submit
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      sortable: false,
      render: (row) => {
        const rowActions: RowAction[] = [];

        if (canWrite) {
          rowActions.push({
            key: "edit",
            label: "Edit",
            icon: Pencil,
            onSelect: () => onEdit(row),
          });
        }

        if (canDelete) {
          rowActions.push({
            key: "delete",
            label: "Delete",
            icon: Trash2,
            destructive: true,
            separatorBefore: canWrite,
            onSelect: () => onDelete(row),
          });
        }

        return <RowActionsMenu label="Type actions" actions={rowActions} />;
      },
    },
  ];
}
