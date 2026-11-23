import type { TableColumn } from "@/components/common/CommonTable";
import type { LicenseRecord } from "@/api/software";
import { Badge } from "@/components/ui/badge";
import { RowActionsMenu } from "@/components/common/RowActionsMenu";

export interface LicenseColumnActions {
  onDelete?: (license: LicenseRecord) => void;
  canDelete?: boolean;
}

export function getLicenseColumns(
  actions: LicenseColumnActions,
): TableColumn<LicenseRecord>[] {
  return [
    {
      id: "id",
      label: "License Key",
      render: (row) => (
        <span className="font-mono text-xs font-medium text-foreground">
          ••••••••{String(row.id).padStart(4, "0").slice(-4)}
        </span>
      ),
    },
    {
      id: "seats_total",
      label: "Total Seats",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-sm">{row.seats_total}</span>
      ),
    },
    {
      id: "seats_used",
      label: "Used Seats",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.seats_used ?? 0}
        </span>
      ),
    },
    {
      id: "seats_available",
      label: "Available",
      sortable: true,
      render: (row) => {
        const available = row.seats_available ?? 0;
        return (
          <Badge
            variant={available > 0 ? "success" : "danger"}
            className="text-xs"
          >
            {available} available
          </Badge>
        );
      },
    },
    {
      id: "expiry_date",
      label: "Expiry Date",
      sortable: true,
      render: (row) => {
        if (!row.expiry_date) {
          return <span className="text-xs text-muted-foreground">Perpetual</span>;
        }
        const isExpired = new Date(row.expiry_date) < new Date();
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {new Date(row.expiry_date).toLocaleDateString()}
            </span>
            {isExpired && (
              <Badge variant="danger" className="text-[10px]">
                Expired
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      label: "Actions",
      sortable: false,
      render: (row) => {
        const menuActions = [
          ...(actions.canDelete !== false && actions.onDelete
            ? [
                {
                  label: "Delete license tier",
                  destructive: true,
                  onSelect: () => actions.onDelete?.(row),
                },
              ]
            : []),
        ];

        if (menuActions.length === 0) return null;

        return (
          <RowActionsMenu
            label={`Actions for license #${row.id}`}
            actions={menuActions}
          />
        );
      },
    },
  ];
}
