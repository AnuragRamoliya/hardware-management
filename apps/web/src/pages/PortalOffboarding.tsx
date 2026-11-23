import { Calendar, Laptop, CheckCircle2, FileText } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { usePortalOffboarding } from "@/hooks/queries/offboarding";
import {
  OFFBOARDING_TASK_STATUS,
  OFFBOARDING_TASK_STATUS_LABELS,
  OFFBOARDING_TASK_STATUS_TONES,
} from "@hm/shared";

export function PortalOffboarding() {
  const { data, isLoading, isError } = usePortalOffboarding();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border bg-card p-8 text-sm text-muted-foreground">
        Loading your departure checklist...
      </div>
    );
  }

  const caseItem = data?.case;
  const tasks = data?.tasks || [];
  const assignedAssets = data?.assignedAssets || [];

  if (isError || !caseItem) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Offboarding"
          description="Your departure checklist, handover procedures, and return clearance."
          breadcrumbs={[
            { label: "Portal", to: "/portal" },
            { label: "My Offboarding" },
          ]}
        />
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <CheckCircle2 className="mb-4 h-12 w-12 text-success" />
          <h2 className="text-lg font-semibold text-foreground">
            No Active Offboarding Case
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You do not currently have an active departure or clearance process
            scheduled.
          </p>
        </Card>
      </div>
    );
  }

  const completedCount = tasks.filter(
    (t) =>
      t.status === OFFBOARDING_TASK_STATUS.COMPLETED ||
      t.status === OFFBOARDING_TASK_STATUS.WAIVED,
  ).length;
  const totalCount = tasks.length;
  const percent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Offboarding"
        description="Review assigned assets, handover tasks, and track your clearance progress."
        breadcrumbs={[
          { label: "Portal", to: "/portal" },
          { label: "My Offboarding" },
        ]}
      />

      {/* Overview Banner */}
      <Card className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">
              Offboarding Clearance in Progress
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              <span>
                Agreed Last Working Day:{" "}
                <strong className="text-foreground">
                  {caseItem.last_working_day}
                </strong>
              </span>
            </div>
            {caseItem.notes && (
              <p className="mt-2 text-xs text-muted-foreground">
                {caseItem.notes}
              </p>
            )}
          </div>

          <div className="min-w-[260px] space-y-2 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Clearance Progress</span>
              <span className="text-foreground">{`${completedCount} / ${totalCount} Done (${percent}%)`}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all ${
                  percent === 100 ? "bg-success" : "bg-primary"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Assets To Return */}
      <Card className="overflow-hidden">
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <Laptop className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">
              Hardware to Return
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Please bring these physical items and their chargers to the IT Help
            Desk on or before your last working day.
          </p>
        </div>
        <div className="divide-y">
          {assignedAssets.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No hardware assets currently assigned.
            </div>
          ) : (
            assignedAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <div className="font-medium text-foreground">
                    {asset.name}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    Asset Tag: {asset.tag}
                  </div>
                </div>
                <Badge variant="outline">Pending Handover</Badge>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Checklist Tasks */}
      <Card className="overflow-hidden">
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">
              Checklist & Clearances
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Departmental approvals and account deactivations tracked by HR and
            IT.
          </p>
        </div>
        <div className="divide-y">
          {tasks.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No checklist items registered.
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <div className="font-medium text-foreground">
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-xs text-muted-foreground">
                      {task.description}
                    </div>
                  )}
                </div>
                <StatusBadge
                  status={task.status}
                  label={OFFBOARDING_TASK_STATUS_LABELS[task.status]}
                  tone={OFFBOARDING_TASK_STATUS_TONES[task.status]}
                />
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
