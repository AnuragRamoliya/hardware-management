import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import type { TableColumn } from "@/components/common/CommonTable";
import {
  RowActionsMenu,
  type RowAction,
} from "@/components/common/RowActionsMenu";
import { Badge } from "@/components/ui/badge";
import { PATHS } from "@/routes/paths";
import type { CredentialCollectionRequestDto } from "@/api/credentials";
import { COLLECTION_REQUEST_STATUS } from "@hm/shared";

export interface CredentialRequestColumnActions {
  onCancel: (request: CredentialCollectionRequestDto) => void;
  canCancel?: boolean;
}

export function getCredentialRequestColumns(
  actions: CredentialRequestColumnActions,
): TableColumn<CredentialCollectionRequestDto>[] {
  const { onCancel, canCancel = true } = actions;

  return [
    {
      id: "employee",
      label: "Target Employee",
      sortable: true,
      render: (row) =>
        row.employee ? (
          <div>
            <Link
              to={PATHS.EMPLOYEE_DETAIL.replace(":id", String(row.employee.id))}
              className="font-medium text-primary hover:underline text-sm"
            >
              {row.employee.first_name} {row.employee.last_name}
            </Link>
            <div className="text-xs text-muted-foreground">
              {row.employee.employee_code}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "credential_type",
      label: "Requested Account Type",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-foreground">
            {row.credential_type?.name}
          </span>
          {row.message && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {row.message}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "requested_by",
      label: "Requested By",
      sortable: false,
      render: (row) =>
        row.requester ? (
          <span className="text-sm">
            {row.requester.first_name} {row.requester.last_name}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "due_date",
      label: "Due Date",
      sortable: true,
      render: (row) => {
        const isOverdue =
          row.request_status === COLLECTION_REQUEST_STATUS.PENDING &&
          new Date(row.due_date).getTime() < Date.now();
        return (
          <span
            className={`text-xs ${
              isOverdue
                ? "text-destructive font-semibold"
                : "text-muted-foreground"
            }`}
          >
            {new Date(row.due_date).toLocaleDateString()}
            {isOverdue && " (Overdue)"}
          </span>
        );
      },
    },
    {
      id: "request_status",
      label: "Status",
      sortable: true,
      render: (row) => {
        switch (row.request_status) {
          case COLLECTION_REQUEST_STATUS.FULFILLED:
            return <Badge variant="success">Fulfilled</Badge>;
          case COLLECTION_REQUEST_STATUS.OVERDUE:
            return <Badge variant="destructive">Overdue</Badge>;
          case COLLECTION_REQUEST_STATUS.CANCELLED:
            return <Badge variant="muted">Cancelled</Badge>;
          case COLLECTION_REQUEST_STATUS.PENDING:
          default:
            return <Badge variant="warning">Awaiting Employee</Badge>;
        }
      },
    },
    {
      id: "actions",
      label: "Actions",
      sortable: false,
      render: (row) => {
        const rowActions: RowAction[] = [];

        if (
          canCancel &&
          row.request_status === COLLECTION_REQUEST_STATUS.PENDING
        ) {
          rowActions.push({
            key: "cancel",
            label: "Cancel Request",
            icon: XCircle,
            destructive: true,
            onSelect: () => onCancel(row),
          });
        }

        return <RowActionsMenu label="Request actions" actions={rowActions} />;
      },
    },
  ];
}
