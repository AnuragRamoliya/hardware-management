import { Link } from "react-router-dom";
import { Eye, Pencil, Trash2, UserPlus } from "lucide-react";
import type { TableColumn } from "@/components/common/CommonTable";
import type { SoftwareRecord } from "@/api/software";
import { Badge } from "@/components/ui/badge";
import { ReferenceLabel } from "@/components/common/ReferenceLabel";
import { RowActionsMenu } from "@/components/common/RowActionsMenu";
import { PATHS } from "@/routes/paths";

export interface SoftwareColumnActions {
  onView: (software: SoftwareRecord) => void;
  onEdit: (software: SoftwareRecord) => void;
  onAssign: (software: SoftwareRecord) => void;
  onDelete: (software: SoftwareRecord) => void;
  canWrite?: boolean;
  canDelete?: boolean;
}

export function getSoftwareColumns(
  actions: SoftwareColumnActions,
): TableColumn<SoftwareRecord>[] {
  return [
    {
      id: "name",
      label: "Software",
      sortable: true,
      render: (row) => (
        <Link
          className="font-medium text-primary hover:underline"
          to={PATHS.SOFTWARE_DETAIL.replace(":id", String(row.id))}
        >
          {row.name}
        </Link>
      ),
    },
    {
      id: "category",
      label: "Category",
      sortable: true,
      render: (row) => (
        <Badge variant="muted" className="capitalize text-xs">
          {row.category}
        </Badge>
      ),
    },
    {
      id: "license_type",
      label: "License Type",
      sortable: true,
      render: (row) => (
        <span className="capitalize text-xs text-muted-foreground">
          {row.license_type.replaceAll("_", " ")}
        </span>
      ),
    },
    {
      id: "seats_used",
      label: "Seat Usage",
      sortable: true,
      render: (row) => {
        const used = row.seats_used ?? 0;
        const total = row.seats_total;
        if (!total) {
          return (
            <Badge variant="info" className="text-xs">
              Unlimited
            </Badge>
          );
        }
        const ratio = used / total;
        const variant =
          ratio >= 1 ? "danger" : ratio >= 0.8 ? "warning" : "success";

        return (
          <div className="flex items-center gap-2">
            <Badge variant={variant} className="text-xs">
              {used} / {total}
            </Badge>
            <span className="text-xs text-muted-foreground">
              ({Math.round(ratio * 100)}%)
            </span>
          </div>
        );
      },
    },
    {
      id: "vendor_id",
      label: "Vendor",
      render: (row) =>
        row.vendor_id ? (
          <ReferenceLabel endpoint="vendor/options" id={row.vendor_id} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "renewal_date",
      label: "Renewal Date",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.renewal_date
            ? new Date(row.renewal_date).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      sortable: false,
      render: (row) => {
        const menuActions = [
          {
            key: "view",
            label: "View details",
            icon: Eye,
            onSelect: () => actions.onView(row),
          },
          ...(actions.canWrite !== false
            ? [
                {
                  key: "edit",
                  label: "Edit",
                  icon: Pencil,
                  onSelect: () => actions.onEdit(row),
                },
                {
                  key: "assign",
                  label: "Assign license",
                  icon: UserPlus,
                  onSelect: () => actions.onAssign(row),
                },
              ]
            : []),
          ...(actions.canDelete !== false
            ? [
                {
                  key: "delete",
                  label: "Delete",
                  icon: Trash2,
                  destructive: true,
                  separatorBefore: true,
                  onSelect: () => actions.onDelete(row),
                },
              ]
            : []),
        ];

        return (
          <RowActionsMenu
            label={`Actions for ${row.name}`}
            actions={menuActions}
          />
        );
      },
    },
  ];
}
