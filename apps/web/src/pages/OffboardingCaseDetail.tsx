import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Laptop,
  KeyRound,
  Command as CommandIcon,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TabsList } from "@/components/ui/tabs";
import { KeyValueList } from "@/components/common/DataDisplay";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  useOffboardingCase,
  useCompleteOffboardingTask,
  useWaiveOffboardingTask,
  useMarkExceptionOffboardingTask,
  useCancelOffboardingCase,
} from "@/hooks/queries/offboarding";
import { PATHS } from "@/routes/paths";
import {
  OFFBOARDING_CASE_STATUS,
  OFFBOARDING_CASE_STATUS_LABELS,
  OFFBOARDING_CASE_STATUS_TONES,
  OFFBOARDING_TASK_TYPE,
  OFFBOARDING_TASK_TYPE_LABELS,
  OFFBOARDING_TASK_STATUS,
  OFFBOARDING_TASK_STATUS_LABELS,
  OFFBOARDING_TASK_STATUS_TONES,
  type OffboardingCaseStatus,
  type OffboardingTaskStatus,
} from "@hm/shared";
import type { OffboardingTaskDto } from "@/api/offboarding";
import useAuthStore from "@/zustand/user-store";
import { getUserRole } from "@/lib/roles";
import { toast } from "sonner";

const tabs = [
  "Overview",
  "Checklist Tasks",
  "Hardware Returns",
  "Software Licenses",
  "Credentials",
] as const;
type Tab = (typeof tabs)[number];

export function OffboardingCaseDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [cancellingOpen, setCancellingOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<{
    task: OffboardingTaskDto;
    action: "complete" | "waive" | "exception";
  } | null>(null);

  const currentUser = useAuthStore((state) => state.user);
  const userRole = getUserRole(currentUser);
  const canManage = ["admin", "hardware", "hr"].includes(userRole);

  const { data: caseItem, isLoading, isError, error } = useOffboardingCase(id);
  const completeMutation = useCompleteOffboardingTask();
  const waiveMutation = useWaiveOffboardingTask();
  const exceptionMutation = useMarkExceptionOffboardingTask();
  const cancelMutation = useCancelOffboardingCase();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border bg-card p-8 text-sm text-muted-foreground">
        Loading offboarding case details...
      </div>
    );
  }

  if (isError || !caseItem) {
    return (
      <Card className="p-8 text-sm text-destructive" role="alert">
        {error instanceof Error ? error.message : "Offboarding case not found"}
      </Card>
    );
  }

  const emp = caseItem.employee;
  const fullName = emp
    ? `${emp.first_name} ${emp.last_name || ""}`.trim()
    : `Employee #${caseItem.employee_id}`;

  const tasks = caseItem.tasks || [];
  const hardwareTasks = tasks.filter(
    (t) => t.task_type === OFFBOARDING_TASK_TYPE.ASSET,
  );
  const softwareTasks = tasks.filter(
    (t) => t.task_type === OFFBOARDING_TASK_TYPE.SOFTWARE,
  );
  const credentialTasks = tasks.filter(
    (t) => t.task_type === OFFBOARDING_TASK_TYPE.CREDENTIAL,
  );

  const caseStatus = ((caseItem as any).case_status ??
    caseItem.status) as OffboardingCaseStatus;
  const completedCount = tasks.filter((t) => {
    const s = ((t as any).task_status ?? t.status) as OffboardingTaskStatus;
    return (
      s === OFFBOARDING_TASK_STATUS.COMPLETED ||
      s === OFFBOARDING_TASK_STATUS.WAIVED
    );
  }).length;
  const totalCount = tasks.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleTaskAction = async () => {
    if (!selectedTask) return;
    const { task, action } = selectedTask;
    if (action === "complete") {
      await completeMutation.mutateAsync({ taskId: task.id });
    } else if (action === "waive") {
      await waiveMutation.mutateAsync({
        taskId: task.id,
        notes: "Waived by staff",
      });
    } else if (action === "exception") {
      await exceptionMutation.mutateAsync({
        taskId: task.id,
        notes: "Marked exception by staff",
      });
    }
    setSelectedTask(null);
  };

  const handleCancelCase = async () => {
    await cancelMutation.mutateAsync({
      id: caseItem.id,
      reason: "Cancelled from case detail view",
    });
    setCancellingOpen(false);
  };

  const handleDownloadClearance = async () => {
    try {
      const token = useAuthStore.getState().token;
      const baseUrl =
        (import.meta as unknown as { env: Record<string, string> }).env
          ?.VITE_API_BASE_URL || "/api";
      const url = `${baseUrl.replace(/\/$/, "")}/offboarding/cases/${caseItem.id}/clearance-pdf`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to download clearance certificate");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Clearance-Certificate-OFF-${caseItem.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Clearance certificate downloaded");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error downloading certificate",
      );
    }
  };

  const overviewItems = [
    {
      label: "Employee ID",
      value: emp?.employee_code ?? `EMP-${caseItem.employee_id}`,
    },
    {
      label: "Department",
      value: emp?.department?.department_name ?? "—",
    },
    {
      label: "Designation",
      value: emp?.designation?.designation_name ?? "—",
    },
    {
      label: "Work Email",
      value: emp?.email ?? "—",
    },
    {
      label: "Initiated By",
      value: caseItem.initiator?.name ?? "System / Admin",
    },
    {
      label: "Departure Reason",
      value: caseItem.reason
        ? caseItem.reason.replace("_", " ")
        : "Resignation",
    },
    {
      label: "Clearance Verification Code",
      value: caseItem.verification_code ? (
        <span className="font-mono font-medium text-primary">
          {caseItem.verification_code}
        </span>
      ) : (
        "Generated on clearance"
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Offboarding: ${fullName}`}
        description={`Case #OFF-${String(caseItem.id).padStart(4, "0")} • Last working day: ${caseItem.last_working_day}`}
        breadcrumbs={[
          { label: "Dashboard", to: "/" },
          { label: "Offboarding Cases", to: PATHS.OFFBOARDING_CASES },
          { label: `Case #${caseItem.id}` },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Link to={PATHS.OFFBOARDING_CASES}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            {(caseStatus === OFFBOARDING_CASE_STATUS.COMPLETED ||
              caseStatus === OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE) && (
              <Button onClick={handleDownloadClearance} className="gap-2">
                <Download className="h-4 w-4" />
                Clearance Certificate
              </Button>
            )}
            {canManage &&
              caseStatus !== OFFBOARDING_CASE_STATUS.COMPLETED &&
              caseStatus !== OFFBOARDING_CASE_STATUS.CANCELLED && (
                <Button
                  variant="outline"
                  onClick={() => setCancellingOpen(true)}
                  className="gap-2 text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Case
                </Button>
              )}
          </div>
        }
      />

      {/* Header Summary Banner */}
      <Card className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {emp?.first_name?.[0] ?? "E"}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-foreground">
                  {fullName}
                </h2>
                <StatusBadge
                  status={caseStatus}
                  label={
                    OFFBOARDING_CASE_STATUS_LABELS[caseStatus] ??
                    String(caseStatus)
                  }
                  tone={OFFBOARDING_CASE_STATUS_TONES[caseStatus] ?? "info"}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {emp?.department?.department_name ?? "General"} • LWD:{" "}
                <span className="font-medium text-foreground">
                  {caseItem.last_working_day}
                </span>
              </p>
            </div>
          </div>

          <div className="min-w-[240px] space-y-2 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Overall Clearance</span>
              <span className="text-foreground">{`${completedCount} / ${totalCount} Done (${progressPercent}%)`}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all ${
                  progressPercent === 100
                    ? "bg-success"
                    : progressPercent > 50
                      ? "bg-primary"
                      : "bg-warning"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      <TabsList
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab: string) => setActiveTab(tab as Tab)}
      />

      {activeTab === "Overview" && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card className="p-6">
            <h3 className="mb-4 text-base font-semibold text-foreground">
              Case & Employee Metadata
            </h3>
            <KeyValueList items={overviewItems} />
            {caseItem.notes && (
              <div className="mt-6 rounded-lg border bg-muted/20 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Handover Notes
                </h4>
                <p className="mt-1 text-sm text-foreground">{caseItem.notes}</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-base font-semibold text-foreground">
              Clearance Task Breakdown
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Laptop className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Hardware Returns</div>
                    <div className="text-xs text-muted-foreground">
                      Physical asset check-ins
                    </div>
                  </div>
                </div>
                <Badge variant="outline">{hardwareTasks.length} items</Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <CommandIcon className="h-5 w-5 text-info" />
                  <div>
                    <div className="font-medium">Software Licenses</div>
                    <div className="text-xs text-muted-foreground">
                      Assigned accounts & seats
                    </div>
                  </div>
                </div>
                <Badge variant="outline">{softwareTasks.length} items</Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <KeyRound className="h-5 w-5 text-warning" />
                  <div>
                    <div className="font-medium">Credential Revocations</div>
                    <div className="text-xs text-muted-foreground">
                      Logins and passwords
                    </div>
                  </div>
                </div>
                <Badge variant="outline">{credentialTasks.length} items</Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "Checklist Tasks" && (
        <Card className="overflow-hidden">
          <div className="border-b p-4">
            <h3 className="font-semibold text-foreground">
              All Clearance Tasks
            </h3>
            <p className="text-xs text-muted-foreground">
              Individual task checklist items required before final certificate
              issuance.
            </p>
          </div>
          <div className="divide-y">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No tasks generated for this case.
              </div>
            ) : (
              tasks.map((task) => {
                const tStatus = String(
                  (task as any).task_status ?? task.status ?? "pending",
                ) as OffboardingTaskStatus;
                const statusLabel =
                  (OFFBOARDING_TASK_STATUS_LABELS as Record<string, string>)[
                    tStatus
                  ] ?? String(tStatus);
                const statusTone =
                  (
                    OFFBOARDING_TASK_STATUS_TONES as Record<
                      string,
                      | "secondary"
                      | "destructive"
                      | "success"
                      | "warning"
                      | "info"
                    >
                  )[tStatus] ?? "secondary";

                return (
                  <div
                    key={task.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {task.title}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {OFFBOARDING_TASK_TYPE_LABELS[task.task_type] ??
                            task.task_type}
                        </Badge>
                        {task.priority && (
                          <Badge
                            variant={
                              task.priority === "urgent" ||
                              task.priority === "high"
                                ? "danger"
                                : "default"
                            }
                            className="text-[10px]"
                          >
                            {task.priority}
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      )}
                      {task.assignee && (
                        <p className="text-xs text-muted-foreground">
                          Assigned to: {task.assignee.name}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge
                        status={tStatus}
                        label={statusLabel}
                        tone={statusTone}
                      />
                      {canManage &&
                        tStatus !== OFFBOARDING_TASK_STATUS.COMPLETED &&
                        tStatus !== OFFBOARDING_TASK_STATUS.WAIVED && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setSelectedTask({ task, action: "complete" })
                              }
                            >
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setSelectedTask({ task, action: "waive" })
                              }
                            >
                              Waive
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() =>
                                setSelectedTask({ task, action: "exception" })
                              }
                            >
                              Exception
                            </Button>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {activeTab === "Hardware Returns" && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h3 className="font-semibold text-foreground">
                Hardware Checklist
              </h3>
              <p className="text-xs text-muted-foreground">
                All physical assets assigned to {fullName} that must be checked
                in.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(PATHS.OFFBOARDING_SCAN_RETURNS)}
              className="gap-2"
            >
              <Laptop className="h-4 w-4" />
              Scan In Hardware
            </Button>
          </div>
          <div className="divide-y">
            {hardwareTasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No hardware assets assigned to this employee.
              </div>
            ) : (
              hardwareTasks.map((t) => {
                const tStatus = String(
                  (t as any).task_status ?? t.status ?? "pending",
                ) as OffboardingTaskStatus;
                const statusLabel =
                  (OFFBOARDING_TASK_STATUS_LABELS as Record<string, string>)[
                    tStatus
                  ] ?? String(tStatus);
                const statusTone =
                  (
                    OFFBOARDING_TASK_STATUS_TONES as Record<
                      string,
                      | "secondary"
                      | "destructive"
                      | "success"
                      | "warning"
                      | "info"
                    >
                  )[tStatus] ?? "secondary";

                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {t.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t.description || "Return required"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge
                        status={tStatus}
                        label={statusLabel}
                        tone={statusTone}
                      />
                      {canManage &&
                        tStatus !== OFFBOARDING_TASK_STATUS.COMPLETED &&
                        tStatus !== OFFBOARDING_TASK_STATUS.WAIVED && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setSelectedTask({ task: t, action: "complete" })
                            }
                          >
                            Mark Returned
                          </Button>
                        )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {activeTab === "Software Licenses" && (
        <Card className="overflow-hidden">
          <div className="border-b p-4">
            <h3 className="font-semibold text-foreground">
              Software Revocations
            </h3>
            <p className="text-xs text-muted-foreground">
              Licenses and application seats assigned to {fullName}.
            </p>
          </div>
          <div className="divide-y">
            {softwareTasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No software licenses assigned to this employee.
              </div>
            ) : (
              softwareTasks.map((t) => {
                const tStatus = String(
                  (t as any).task_status ?? t.status ?? "pending",
                ) as OffboardingTaskStatus;
                const statusLabel =
                  (OFFBOARDING_TASK_STATUS_LABELS as Record<string, string>)[
                    tStatus
                  ] ?? String(tStatus);
                const statusTone =
                  (
                    OFFBOARDING_TASK_STATUS_TONES as Record<
                      string,
                      | "secondary"
                      | "destructive"
                      | "success"
                      | "warning"
                      | "info"
                    >
                  )[tStatus] ?? "secondary";

                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {t.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t.description || "Revocation task"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge
                        status={tStatus}
                        label={statusLabel}
                        tone={statusTone}
                      />
                      {canManage &&
                        tStatus !== OFFBOARDING_TASK_STATUS.COMPLETED && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSelectedTask({ task: t, action: "complete" })
                            }
                          >
                            Confirm Revoked
                          </Button>
                        )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {activeTab === "Credentials" && (
        <Card className="overflow-hidden">
          <div className="border-b p-4">
            <h3 className="font-semibold text-foreground">
              Credential Revocations
            </h3>
            <p className="text-xs text-muted-foreground">
              Logins and access vaults assigned to {fullName}.
            </p>
          </div>
          <div className="divide-y">
            {credentialTasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No credentials assigned to this employee.
              </div>
            ) : (
              credentialTasks.map((t) => {
                const tStatus = String(
                  (t as any).task_status ?? t.status ?? "pending",
                ) as OffboardingTaskStatus;
                const statusLabel =
                  (OFFBOARDING_TASK_STATUS_LABELS as Record<string, string>)[
                    tStatus
                  ] ?? String(tStatus);
                const statusTone =
                  (
                    OFFBOARDING_TASK_STATUS_TONES as Record<
                      string,
                      | "secondary"
                      | "destructive"
                      | "success"
                      | "warning"
                      | "info"
                    >
                  )[tStatus] ?? "secondary";

                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {t.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t.description || "Revocation task"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge
                        status={tStatus}
                        label={statusLabel}
                        tone={statusTone}
                      />
                      {canManage &&
                        tStatus !== OFFBOARDING_TASK_STATUS.COMPLETED && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSelectedTask({ task: t, action: "complete" })
                            }
                          >
                            Revoke Account
                          </Button>
                        )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* Task Action Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(selectedTask)}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        title={
          selectedTask?.action === "complete"
            ? "Complete task"
            : selectedTask?.action === "waive"
              ? "Waive task"
              : "Mark task exception"
        }
        description={`Confirm ${selectedTask?.action} for "${selectedTask?.task.title}"?`}
        confirmText="Confirm"
        onConfirm={handleTaskAction}
      />

      {/* Cancel Case Confirm Dialog */}
      <ConfirmDialog
        open={cancellingOpen}
        onOpenChange={setCancellingOpen}
        title="Cancel offboarding case"
        description={`Are you sure you want to cancel the offboarding process for ${fullName}?`}
        confirmText="Cancel Case"
        variant="destructive"
        onConfirm={handleCancelCase}
      />
    </div>
  );
}
