import { Link } from "react-router-dom";
import {
  Eye,
  UserCheck,
  UserPlus,
  FileCheck2,
  PackageCheck,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PackageX,
} from "lucide-react";
import type { TableColumn } from "@/components/common/CommonTable";
import {
  RowActionsMenu,
  type RowAction,
} from "@/components/common/RowActionsMenu";
import { Badge } from "@/components/ui/badge";
import { PATHS } from "@/routes/paths";
import {
  REQUEST_TYPE_LABELS,
  REQUEST_STATUS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONES,
  REQUEST_PRIORITY_LABELS,
  REQUEST_PRIORITY_TONES,
  type RequestDto,
} from "@hm/shared";

export interface RequestColumnActions {
  onView: (req: RequestDto) => void;
  onTake: (req: RequestDto) => void;
  onAssign: (req: RequestDto) => void;
  onReview: (req: RequestDto) => void;
  onFulfil: (req: RequestDto) => void;
  onComment: (req: RequestDto) => void;
  onClose: (req: RequestDto) => void;
  currentUserId?: number;
  canWrite?: boolean;
  canApprove?: boolean;
}

export function getRequestColumns(
  actions: RequestColumnActions,
): TableColumn<RequestDto>[] {
  return [
    {
      id: "request_no",
      label: "Request #",
      sortable: true,
      render: (row) => (
        <Link
          to={PATHS.REQUEST_DETAIL.replace(":id", String(row.id))}
          className="font-semibold text-primary hover:underline whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          {row.request_no}
        </Link>
      ),
    },
    {
      id: "employee",
      label: "Employee",
      sortable: true,
      render: (row) => {
        const emp = row.employee;
        if (!emp) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-foreground truncate">
              {emp.first_name} {emp.last_name || ""}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {emp.employee_code}{" "}
              {emp.department ? `• ${emp.department.name}` : ""}
            </span>
          </div>
        );
      },
    },
    {
      id: "request_type",
      label: "Type",
      sortable: true,
      render: (row) => (
        <Badge variant="outline" className="font-medium whitespace-nowrap">
          {REQUEST_TYPE_LABELS[row.request_type] || "Unknown"}
        </Badge>
      ),
    },
    {
      id: "title",
      label: "Title & Details",
      sortable: true,
      render: (row) => (
        <div className="flex flex-col min-w-0 max-w-xs">
          <span className="font-medium text-foreground truncate">
            {row.title}
          </span>
          <span className="text-xs text-muted-foreground truncate line-clamp-1">
            {row.reason}
          </span>
        </div>
      ),
    },
    {
      id: "priority",
      label: "Priority",
      sortable: true,
      render: (row) => {
        const tone = REQUEST_PRIORITY_TONES[row.priority] || "muted";
        return (
          <Badge variant={tone} className="whitespace-nowrap">
            {REQUEST_PRIORITY_LABELS[row.priority] || "Normal"}
          </Badge>
        );
      },
    },
    {
      id: "request_status",
      label: "Status",
      sortable: true,
      render: (row) => {
        const tone = REQUEST_STATUS_TONES[row.request_status] || "info";
        const label = REQUEST_STATUS_LABELS[row.request_status] || "Unknown";
        return (
          <Badge variant={tone} className="whitespace-nowrap font-medium">
            {label}
          </Badge>
        );
      },
    },
    {
      id: "assigned_to",
      label: "Assignee",
      sortable: true,
      render: (row) => {
        if (!row.assignee) {
          return (
            <Badge variant="muted" className="text-xs font-normal">
              Unassigned
            </Badge>
          );
        }
        return (
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {row.assignee.first_name} {row.assignee.last_name || ""}
          </span>
        );
      },
    },
    {
      id: "sla",
      label: "SLA / State",
      render: (row) => {
        if (row.sla_breached) {
          return (
            <Badge
              variant="danger"
              className="flex items-center gap-1 whitespace-nowrap"
            >
              <AlertTriangle className="h-3 w-3" />
              SLA Breached
            </Badge>
          );
        }
        if (row.awaiting_stock) {
          return (
            <Badge
              variant="warning"
              className="flex items-center gap-1 whitespace-nowrap"
            >
              <PackageX className="h-3 w-3" />
              Awaiting Stock
            </Badge>
          );
        }
        if (
          row.sla_due_at &&
          row.request_status !== REQUEST_STATUS.CLOSED &&
          row.request_status !== REQUEST_STATUS.FULFILLED
        ) {
          const due = new Date(row.sla_due_at);
          return (
            <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
              <Clock className="h-3 w-3" />
              {due.toLocaleDateString()}
            </span>
          );
        }
        return <span className="text-xs text-muted-foreground">-</span>;
      },
    },
    {
      id: "createdAt",
      label: "Created",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      render: (row) => {
        const isClosed = row.request_status === REQUEST_STATUS.CLOSED;
        const isCancelled = row.request_status === REQUEST_STATUS.CANCELLED;
        const isRejected = row.request_status === REQUEST_STATUS.REJECTED;
        const isFulfilled = row.request_status === REQUEST_STATUS.FULFILLED;
        const isApproved = row.request_status === REQUEST_STATUS.APPROVED;
        const isUnderReview =
          row.request_status === REQUEST_STATUS.UNDER_REVIEW;

        const isAssignedToMe = row.assigned_to === actions.currentUserId;

        const menuActions: RowAction[] = [
          {
            key: "view",
            label: "View details",
            icon: Eye,
            onSelect: () => actions.onView(row),
          },
          {
            key: "take",
            label: "Take request",
            icon: UserCheck,
            hidden:
              !actions.canWrite || isAssignedToMe || isClosed || isCancelled,
            onSelect: () => actions.onTake(row),
          },
          {
            key: "assign",
            label: "Assign to...",
            icon: UserPlus,
            hidden: !actions.canWrite || isClosed || isCancelled,
            onSelect: () => actions.onAssign(row),
          },
          {
            key: "review",
            label: "Review request",
            icon: FileCheck2,
            hidden:
              !actions.canApprove ||
              isClosed ||
              isCancelled ||
              isFulfilled ||
              isRejected,
            onSelect: () => actions.onReview(row),
          },
          {
            key: "fulfil",
            label: "Fulfil request",
            icon: PackageCheck,
            hidden: !actions.canApprove || (!isApproved && !isUnderReview),
            onSelect: () => actions.onFulfil(row),
          },
          {
            key: "comment",
            label: "Add comment",
            icon: MessageSquare,
            onSelect: () => actions.onComment(row),
          },
          {
            key: "close",
            label: "Close request",
            icon: CheckCircle2,
            hidden: !actions.canWrite || !isFulfilled,
            separatorBefore: true,
            onSelect: () => actions.onClose(row),
          },
        ];

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActionsMenu actions={menuActions} />
          </div>
        );
      },
    },
  ];
}
