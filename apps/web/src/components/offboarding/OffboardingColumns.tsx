import { Link } from "react-router-dom";
import { Eye, FileDown, Trash2 } from "lucide-react";
import type { TableColumn } from "@/components/common/CommonTable";
import {
  RowActionsMenu,
  type RowAction,
} from "@/components/common/RowActionsMenu";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PATHS } from "@/routes/paths";
import {
  OFFBOARDING_CASE_STATUS,
  OFFBOARDING_CASE_STATUS_LABELS,
  OFFBOARDING_CASE_STATUS_TONES,
  type OffboardingCaseStatus,
} from "@hm/shared";
import type { OffboardingCaseDto } from "@/api/offboarding";

export interface OffboardingColumnActions {
  onView: (c: OffboardingCaseDto) => void;
  onCancel: (c: OffboardingCaseDto) => void;
  onDownloadClearance: (c: OffboardingCaseDto) => void;
  canWrite?: boolean;
}

export function getOffboardingColumns(
  actions: OffboardingColumnActions,
): TableColumn<OffboardingCaseDto>[] {
  return [
    {
      id: "id",
      label: "Case #",
      sortable: true,
      render: (row) => (
        <Link
          to={PATHS.OFFBOARDING_CASE_DETAIL.replace(":id", String(row.id))}
          className="font-medium text-primary hover:underline"
        >
          {`OFF-${String(row.id).padStart(4, "0")}`}
        </Link>
      ),
    },
    {
      id: "employee",
      label: "Employee",
      sortable: true,
      render: (row) => {
        const emp = row.employee;
        const name = emp
          ? `${emp.first_name} ${emp.last_name || ""}`.trim()
          : `Employee #${row.employee_id}`;
        return (
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {emp?.first_name?.[0] ?? "E"}
            </div>
            <div>
              <div className="font-medium text-foreground">{name}</div>
              <div className="text-xs text-muted-foreground">
                {emp?.employee_code ?? emp?.email ?? ""}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: "department",
      label: "Department",
      sortable: false,
      render: (row) => (
        <span className="text-sm text-foreground">
          {row.employee?.department?.department_name ?? "—"}
        </span>
      ),
    },
    {
      id: "last_working_day",
      label: "Last working day",
      sortable: true,
      render: (row) => {
        const rawDate = row.last_working_date || row.last_working_day;
        const lwd = rawDate ? new Date(rawDate) : null;
        if (!lwd || isNaN(lwd.getTime())) return <span>{rawDate ?? "—"}</span>;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        lwd.setHours(0, 0, 0, 0);
        const diffDays = Math.round(
          (lwd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        const formatted = lwd.toLocaleDateString();

        return (
          <div>
            <div className="text-sm font-medium text-foreground">
              {formatted}
            </div>
            <div className="text-xs text-muted-foreground">
              {diffDays === 0
                ? "Today"
                : diffDays > 0
                  ? `in ${diffDays} day${diffDays === 1 ? "" : "s"}`
                  : `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`}
            </div>
          </div>
        );
      },
    },
    {
      id: "progress",
      label: "Tasks cleared",
      sortable: false,
      render: (row) => {
        const total =
          row.progress?.total ??
          row.tasks_count ??
          (row.tasks ? row.tasks.length : 0);
        const completed = row.progress
          ? row.progress.completed + row.progress.waived
          : (row.completed_tasks_count ??
            (row.tasks
              ? row.tasks.filter(
                  (t) =>
                    t.status === "completed" ||
                    t.status === "waived" ||
                    (t as any).task_status === "completed" ||
                    (t as any).task_status === "waived",
                ).length
              : 0));
        const percent =
          row.progress?.percent ??
          (total > 0 ? Math.round((completed / total) * 100) : 0);
        return (
          <div className="w-28 space-y-1">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>{`${completed}/${total}`}</span>
              <span>{`${percent}%`}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all ${
                  percent === 100
                    ? "bg-success"
                    : percent > 50
                      ? "bg-primary"
                      : "bg-warning"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      id: "status",
      label: "Status",
      sortable: true,
      render: (row) => {
        const st = (row.case_status ?? row.status) as OffboardingCaseStatus;
        const label =
          (typeof st === "string" && OFFBOARDING_CASE_STATUS_LABELS[st]) ||
          String(st ?? "unknown");
        const tone =
          (typeof st === "string" && OFFBOARDING_CASE_STATUS_TONES[st]) ||
          "info";
        return <StatusBadge status={st} label={label} tone={tone} />;
      },
    },
    {
      id: "actions",
      label: "Actions",
      sortable: false,
      render: (row) => {
        const menuActions: RowAction[] = [
          {
            key: "view",
            label: "View details",
            icon: Eye,
            onSelect: () => actions.onView(row),
          },
        ];

        if (
          row.status === OFFBOARDING_CASE_STATUS.COMPLETED ||
          row.status === OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE
        ) {
          menuActions.push({
            key: "download",
            label: "Clearance certificate",
            icon: FileDown,
            onSelect: () => actions.onDownloadClearance(row),
          });
        }

        if (
          actions.canWrite &&
          row.status !== OFFBOARDING_CASE_STATUS.COMPLETED &&
          row.status !== OFFBOARDING_CASE_STATUS.CANCELLED
        ) {
          menuActions.push({
            key: "cancel",
            label: "Cancel case",
            icon: Trash2,
            destructive: true,
            separatorBefore: true,
            onSelect: () => actions.onCancel(row),
          });
        }

        return (
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <RowActionsMenu label="Case actions" actions={menuActions} />
          </div>
        );
      },
    },
  ];
}
