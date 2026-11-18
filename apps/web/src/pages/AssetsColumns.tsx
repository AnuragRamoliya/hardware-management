import { Link } from "react-router-dom";
import type { TableColumn } from "@/components/common/CommonTable";
import type { AssetRecord } from "@/api/assets";
import { Badge } from "@/components/ui/badge";
import { RowActionsMenu } from "@/components/common/RowActionsMenu";
import { ReferenceLabel } from "@/components/common/ReferenceLabel";
import { ASSET_CONDITIONS } from "@/utils/constants";
import { PATHS } from "@/routes/paths";
import { AssetStatusBadge } from "@/components/assets/AssetStatusBadge";

export interface AssetColumnActions {
  onView: (asset: AssetRecord) => void;
  onEdit: (asset: AssetRecord) => void;
  onAssign: (asset: AssetRecord) => void;
  onReturn: (asset: AssetRecord) => void;
  onTransfer: (asset: AssetRecord) => void;
  onMaintenance: (asset: AssetRecord) => void;
  onQr: (asset: AssetRecord) => void;
  onDelete: (asset: AssetRecord) => void;
  canWrite?: boolean;
  canDelete?: boolean;
}

export function getAssetsColumns(actions: AssetColumnActions): TableColumn<AssetRecord>[] {
  return [
    {
      id: "asset_tag",
      label: "Asset Tag",
      sortable: true,
      render: (row) => (
        <div>
          <Link
            to={PATHS.ASSET_DETAIL.replace(":id", String(row.id))}
            className="font-medium text-primary hover:underline"
          >
            {row.asset_tag}
          </Link>
          {row.serial_no && (
            <p className="text-xs text-muted-foreground">SN: {row.serial_no}</p>
          )}
        </div>
      ),
    },
    {
      id: "model",
      label: "Brand & Model",
      sortable: true,
      render: (row) => (
        <span>{[row.brand, row.model].filter(Boolean).join(" ") || "—"}</span>
      ),
    },
    {
      id: "category_id",
      label: "Category",
      sortable: false,
      render: (row) => (
        <ReferenceLabel endpoint="asset_category/options" id={row.category_id} />
      ),
    },
    {
      id: "location_id",
      label: "Location",
      sortable: false,
      render: (row) => (
        <ReferenceLabel endpoint="location/options" id={row.location_id} />
      ),
    },
    {
      id: "assigned_to",
      label: "Assigned To",
      sortable: false,
      render: (row) => {
        const emp = row.current_assignment?.employee;
        if (!emp) {
          return <span className="text-xs text-muted-foreground">Unassigned</span>;
        }
        return (
          <span className="text-sm font-medium">
            {emp.first_name} {emp.last_name}
          </span>
        );
      },
    },
    {
      id: "condition",
      label: "Condition",
      sortable: true,
      render: (row) => {
        const label =
          ASSET_CONDITIONS.find((c) => c.value === row.condition)?.label ??
          row.condition ??
          "—";
        return (
          <Badge variant="muted" className="capitalize text-xs">
            {label}
          </Badge>
        );
      },
    },
    {
      id: "asset_status",
      label: "Status",
      sortable: true,
      render: (row) => <AssetStatusBadge status={row.asset_status} />,
    },
    {
      id: "warranty_end",
      label: "Warranty End",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.warranty_end ? new Date(row.warranty_end).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      sortable: false,
      render: (row) => {
        const isAssigned = row.asset_status === 2;
        const isAvailable = row.asset_status === 1;
        const menuActions = [
          {
            label: "View details",
            onSelect: () => actions.onView(row),
          },
          ...(actions.canWrite !== false
            ? [
                {
                  label: "Edit",
                  onSelect: () => actions.onEdit(row),
                },
                ...(isAvailable
                  ? [
                      {
                        label: "Assign asset",
                        onSelect: () => actions.onAssign(row),
                      },
                    ]
                  : []),
                ...(isAssigned
                  ? [
                      {
                        label: "Return asset",
                        onSelect: () => actions.onReturn(row),
                      },
                      {
                        label: "Transfer asset",
                        onSelect: () => actions.onTransfer(row),
                      },
                    ]
                  : []),
                {
                  label: "Send to maintenance",
                  onSelect: () => actions.onMaintenance(row),
                },
              ]
            : []),
          {
            label: "QR code / label",
            onSelect: () => actions.onQr(row),
          },
          ...(actions.canDelete !== false
            ? [
                {
                  label: "Delete",
                  destructive: true,
                  disabled: isAssigned,
                  onSelect: () => actions.onDelete(row),
                },
              ]
            : []),
        ];

        return <RowActionsMenu label={`Actions for ${row.asset_tag}`} actions={menuActions} />;
      },
    },
  ];
}
