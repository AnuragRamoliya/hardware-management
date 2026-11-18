import { Link } from "react-router-dom";
import {
  ArrowRightLeft,
  Eye,
  Pencil,
  QrCode,
  RotateCcw,
  Trash2,
  UserPlus,
  Wrench,
} from "lucide-react";
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

export function getAssetsColumns(
  actions: AssetColumnActions,
): TableColumn<AssetRecord>[] {
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
        <ReferenceLabel
          endpoint="asset_category/options"
          id={row.category_id}
        />
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
          return (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          );
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
          {row.warranty_end
            ? new Date(row.warranty_end).toLocaleDateString()
            : "—"}
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
                ...(isAvailable
                  ? [
                      {
                        key: "assign",
                        label: "Assign asset",
                        icon: UserPlus,
                        onSelect: () => actions.onAssign(row),
                      },
                    ]
                  : []),
                ...(isAssigned
                  ? [
                      {
                        key: "return",
                        label: "Return asset",
                        icon: RotateCcw,
                        onSelect: () => actions.onReturn(row),
                      },
                      {
                        key: "transfer",
                        label: "Transfer asset",
                        icon: ArrowRightLeft,
                        onSelect: () => actions.onTransfer(row),
                      },
                    ]
                  : []),
                {
                  key: "maintenance",
                  label: "Send to maintenance",
                  icon: Wrench,
                  onSelect: () => actions.onMaintenance(row),
                },
              ]
            : []),
          {
            key: "qr",
            label: "QR code / label",
            icon: QrCode,
            onSelect: () => actions.onQr(row),
          },
          ...(actions.canDelete !== false
            ? [
                {
                  key: "delete",
                  label: "Delete",
                  icon: Trash2,
                  destructive: true,
                  separatorBefore: true,
                  disabled: isAssigned,
                  disabledReason: isAssigned
                    ? "Assigned assets cannot be deleted"
                    : undefined,
                  onSelect: () => actions.onDelete(row),
                },
              ]
            : []),
        ];

        return (
          <RowActionsMenu
            label={`Actions for ${row.asset_tag}`}
            actions={menuActions}
          />
        );
      },
    },
  ];
}
