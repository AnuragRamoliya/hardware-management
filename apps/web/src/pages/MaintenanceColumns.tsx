import { Link } from "react-router-dom";
import { CheckCircle2, Eye } from "lucide-react";
import type { TableColumn } from "@/components/common/CommonTable";
import type { MaintenanceRecord } from "@/hooks/queries/maintenance";
import { Badge } from "@/components/ui/badge";
import { ReferenceLabel } from "@/components/common/ReferenceLabel";
import { RowActionsMenu } from "@/components/common/RowActionsMenu";
import { PATHS } from "@/routes/paths";

export interface MaintenanceColumnActions {
  onComplete: (record: MaintenanceRecord) => void;
  onViewAsset: (assetId: number) => void;
  canWrite?: boolean;
}

export function getMaintenanceColumns(
  actions: MaintenanceColumnActions,
): TableColumn<MaintenanceRecord>[] {
  return [
    {
      id: "asset_id",
      label: "Asset Tag",
      sortable: true,
      render: (row) => (
        <Link
          className="font-medium text-primary hover:underline"
          to={PATHS.ASSET_DETAIL.replace(":id", String(row.asset_id))}
        >
          <ReferenceLabel endpoint="asset/options" id={row.asset_id} />
        </Link>
      ),
    },
    {
      id: "issue",
      label: "Issue / Task",
      render: (row) => (
        <span className="font-medium text-foreground max-w-xs truncate block">
          {row.issue}
        </span>
      ),
    },
    {
      id: "vendor_id",
      label: "Service Vendor",
      render: (row) =>
        row.vendor_id ? (
          <ReferenceLabel endpoint="vendor/options" id={row.vendor_id} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "maintenance_status",
      label: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant={row.maintenance_status === 1 ? "warning" : "success"}>
          {row.maintenance_status === 1 ? "In Maintenance" : "Completed"}
        </Badge>
      ),
    },
    {
      id: "sent_at",
      label: "Sent Date",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.sent_at ? new Date(row.sent_at).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      id: "returned_at",
      label: "Returned Date",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.returned_at
            ? new Date(row.returned_at).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
    {
      id: "cost",
      label: "Repair Cost",
      sortable: true,
      render: (row) => (
        <span className="font-medium">
          {row.cost != null ? `$${Number(row.cost).toFixed(2)}` : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      sortable: false,
      render: (row) => {
        const isInProgress = row.maintenance_status === 1;
        const menuActions = [
          {
            key: "view",
            label: "View asset details",
            icon: Eye,
            onSelect: () => actions.onViewAsset(row.asset_id),
          },
          ...(actions.canWrite && isInProgress
            ? [
                {
                  key: "complete",
                  label: "Mark completed",
                  icon: CheckCircle2,
                  onSelect: () => actions.onComplete(row),
                },
              ]
            : []),
        ];

        return (
          <RowActionsMenu
            label={`Actions for maintenance #${row.id}`}
            actions={menuActions}
          />
        );
      },
    },
  ];
}
