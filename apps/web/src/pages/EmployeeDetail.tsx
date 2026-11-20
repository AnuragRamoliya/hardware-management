import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  BriefcaseBusiness,
  UserRound,
  MapPin,
  Calendar,
  IdCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/States";
import { PageHeader } from "@/components/common/PageHeader";
import {
  KeyValueList,
  Timeline,
  type TimelineItem,
} from "@/components/common/DataDisplay";
import { PATHS } from "@/routes/paths";
import { ReferenceLabel } from "@/components/common/ReferenceLabel";
import { TabsList } from "@/components/ui/tabs";
import { AssetStatusBadge } from "@/components/assets/AssetStatusBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { callApi } from "@/api/callApi";
import { api_methods, endPoints } from "@/api/endpoint";
import type { AssignmentRecord } from "@/api/assets";
import type { SoftwareAssignment } from "@/api/software";
import { assetsApi } from "@/api/assets";
import { softwareApi } from "@/api/software";
import useAuthStore from "@/zustand/user-store";
import { getUserRole } from "@/lib/roles";
import { useEmployee, useEmployeeActivity } from "@/hooks/queries/employee";
import {
  useCredentialsList,
  useDeleteCredential,
} from "@/hooks/queries/credentials";
import type { CredentialDto } from "@/api/credentials";
import { AddEditCredential } from "@/components/credentials/AddEditCredential";
import { CreateCollectionRequestDialog } from "@/components/credentials/CreateCollectionRequestDialog";
import { RevealSecretDialog } from "@/components/credentials/RevealSecretDialog";
import { RotatePasswordDialog } from "@/components/credentials/RotatePasswordDialog";
import { CredentialHistoryDialog } from "@/components/credentials/CredentialHistoryDialog";
import { Plus, Send, Eye, RefreshCw, Trash2, History } from "lucide-react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { RowActionsMenu } from "@/components/common/RowActionsMenu";
import {
  CREDENTIAL_APPROVAL_STATUS,
  EMPLOYMENT_STATUS,
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_STATUS_TONES,
  type EmploymentStatus,
  PROVIDED_BY,
  REQUEST_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONES,
  REQUEST_PRIORITY_LABELS,
  REQUEST_PRIORITY_TONES,
} from "@hm/shared";
import { useRequests } from "@/hooks/queries/requests";

const tabs = [
  "Overview",
  "Hardware",
  "Software",
  "Accounts",
  "Requests",
  "Activity",
] as const;
type Tab = (typeof tabs)[number];

export function EmployeeDetail() {
  const { id = "" } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const client = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const canManageAssets = ["admin", "hardware"].includes(
    getUserRole(currentUser),
  );

  const { data: employee, isLoading, isError, error } = useEmployee(id);

  const [addCredOpen, setAddCredOpen] = useState(false);
  const [requestCredOpen, setRequestCredOpen] = useState(false);
  const [revealingCred, setRevealingCred] = useState<CredentialDto | null>(
    null,
  );
  const [rotatingCred, setRotatingCred] = useState<CredentialDto | null>(null);
  const [historyCred, setHistoryCred] = useState<CredentialDto | null>(null);
  const [deletingCred, setDeletingCred] = useState<CredentialDto | null>(null);

  const credentialsQuery = useCredentialsList({
    currentPage: 1,
    itemsPerPage: 50,
    sortBy: [],
    filters: { employee_id: Number(id) },
  });
  const employeeRequestsQuery = useRequests({
    currentPage: 1,
    itemsPerPage: 50,
    sortBy: [],
    filters: { employee_id: Number(id) },
  });
  const deleteCredMutation = useDeleteCredential();

  const activityQuery = useEmployeeActivity(id, activeTab === "Activity");

  const assetRows = useQuery({
    queryKey: ["employee-assets", id],
    enabled: activeTab === "Hardware",
    queryFn: async () => {
      const result = await callApi<AssignmentRecord[]>({
        url: endPoints.employeeAssets(id),
        method: api_methods.GET,
      });
      if (!result.ok) throw new Error(result.message);
      return result.data ?? [];
    },
  });

  const softwareRows = useQuery({
    queryKey: ["employee-software", id],
    enabled: activeTab === "Software",
    queryFn: async () => {
      const result = await callApi<SoftwareAssignment[]>({
        url: endPoints.employeeSoftware(id),
        method: api_methods.GET,
      });
      if (!result.ok) throw new Error(result.message);
      return result.data ?? [];
    },
  });

  const returnAsset = useMutation({
    mutationFn: async (assetId: number) => {
      const result = await assetsApi.returnAsset({ asset_id: assetId });
      if (!result.ok) throw new Error(result.message);
    },
    onSuccess: () => {
      toast.success("Asset returned");
      void client.invalidateQueries({ queryKey: ["employee-assets", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeSoftware = useMutation({
    mutationFn: async (assignmentId: number) => {
      const result = await softwareApi.revoke(assignmentId);
      if (!result.ok) throw new Error(result.message);
    },
    onSuccess: () => {
      toast.success("Software access revoked");
      void client.invalidateQueries({ queryKey: ["employee-software", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-xl border bg-card p-8 text-sm text-muted-foreground">
        Loading employee profile…
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <Card className="p-8 text-sm text-danger" role="alert">
        {error instanceof Error ? error.message : "Employee not found"}
      </Card>
    );
  }

  const empStatusVal = (employee.employment_status ??
    EMPLOYMENT_STATUS.ACTIVE) as EmploymentStatus;
  const employmentStatus = EMPLOYMENT_STATUS_LABELS[empStatusVal] ?? "Active";
  const employmentTone = EMPLOYMENT_STATUS_TONES[empStatusVal] ?? "muted";

  const fullName = `${employee.first_name} ${employee.last_name ?? ""}`.trim();

  const overviewItems = [
    {
      label: "Work email",
      value: (
        <span className="flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          {employee.email}
        </span>
      ),
    },
    {
      label: "Department",
      value: (
        <span className="flex items-center gap-1.5">
          <BriefcaseBusiness className="h-3.5 w-3.5 text-muted-foreground" />
          <ReferenceLabel
            endpoint="department/options"
            id={employee.department_id as number | undefined}
          />
        </span>
      ),
    },
    {
      label: "Designation",
      value: (
        <span className="flex items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
          <ReferenceLabel
            endpoint="designation/options"
            id={employee.designation_id as number | undefined}
          />
        </span>
      ),
    },
    {
      label: "Location",
      value: (
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <ReferenceLabel
            endpoint="location/options"
            id={employee.location_id as number | undefined}
          />
        </span>
      ),
    },
  ];

  const employmentItems = [
    {
      label: "Employee ID",
      value: (
        <span className="flex items-center gap-1.5">
          <IdCard className="h-3.5 w-3.5 text-muted-foreground" />
          {employee.employee_code ?? "—"}
        </span>
      ),
    },
    {
      label: "Start date",
      value: (
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          {employee.join_date ?? "—"}
        </span>
      ),
    },
    {
      label: "Status",
      value: (
        <StatusBadge
          status={empStatusVal}
          label={employmentStatus}
          tone={employmentTone}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={fullName}
        description="Employee profile and resource allocation"
        breadcrumbs={[
          { label: "Dashboard", to: "/" },
          { label: "Employees", to: PATHS.EMPLOYEES },
          { label: fullName },
        ]}
        action={
          <Link to={PATHS.EMPLOYEES}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to employees
            </Button>
          </Link>
        }
      />

      <TabsList
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as Tab)}
      />

      {activeTab === "Overview" ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card className="p-6">
            <div className="flex items-center gap-4 pb-6 border-b">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                {employee.first_name[0]}
                {employee.last_name?.[0]}
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-lg">
                  {fullName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {employee.employee_code ?? "Employee"}
                </p>
              </div>
              <StatusBadge
                className="ml-auto"
                status={empStatusVal}
                label={employmentStatus}
                tone={employmentTone}
              />
            </div>
            <div className="mt-6">
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                Contact & Placement
              </h3>
              <KeyValueList items={overviewItems} />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-base font-semibold text-foreground">
              Employment Details
            </h2>
            <div className="mt-4">
              <KeyValueList items={employmentItems} />
            </div>
          </Card>
        </div>
      ) : activeTab === "Hardware" ? (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Hardware Custody & History
            </h2>
          </div>
          {assetRows.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading hardware records…
            </p>
          ) : assetRows.data?.length ? (
            <div className="divide-y rounded-lg border">
              {assetRows.data.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={PATHS.ASSET_DETAIL.replace(
                          ":id",
                          String(assignment.asset?.id ?? assignment.asset_id),
                        )}
                        className="font-medium text-primary hover:underline"
                      >
                        {assignment.asset?.asset_tag ??
                          `Asset #${assignment.asset_id}`}
                      </Link>
                      <AssetStatusBadge
                        status={assignment.asset?.asset_status}
                      />
                      <Badge
                        variant={assignment.returned_at ? "muted" : "success"}
                        className="text-xs"
                      >
                        {assignment.returned_at ? "Returned" : "Active Custody"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[assignment.asset?.brand, assignment.asset?.model]
                        .filter(Boolean)
                        .join(" ")}
                      {assignment.due_return_date
                        ? ` · Due: ${new Date(assignment.due_return_date).toLocaleDateString()}`
                        : ""}
                      {assignment.returned_at
                        ? ` · Returned: ${new Date(assignment.returned_at).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  {canManageAssets && !assignment.returned_at && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={returnAsset.isPending}
                      onClick={() =>
                        returnAsset.mutate(Number(assignment.asset_id))
                      }
                    >
                      Return Asset
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No hardware assigned"
              description="No physical equipment has been assigned to this employee."
            />
          )}
        </Card>
      ) : activeTab === "Software" ? (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Software & Subscription Access
            </h2>
          </div>
          {softwareRows.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading software access…
            </p>
          ) : softwareRows.data?.length ? (
            <div className="divide-y rounded-lg border">
              {softwareRows.data.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={PATHS.SOFTWARE_DETAIL.replace(
                          ":id",
                          String(
                            assignment.software?.id ?? assignment.software_id,
                          ),
                        )}
                        className="font-medium text-primary hover:underline"
                      >
                        {assignment.software?.name ?? "Software application"}
                      </Link>
                      <Badge variant="muted" className="capitalize text-xs">
                        {assignment.software?.category ?? "Productivity"}
                      </Badge>
                      <Badge
                        variant={assignment.revoked_at ? "muted" : "success"}
                        className="text-xs"
                      >
                        {assignment.revoked_at ? "Revoked" : "Active Access"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Assigned:{" "}
                      {new Date(assignment.assigned_at).toLocaleDateString()}
                      {assignment.revoked_at
                        ? ` · Revoked: ${new Date(assignment.revoked_at).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  {canManageAssets && !assignment.revoked_at && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={revokeSoftware.isPending}
                      onClick={() =>
                        revokeSoftware.mutate(Number(assignment.id))
                      }
                    >
                      Revoke Access
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No software allocated"
              description="No software licenses or application seats are currently assigned to this employee."
            />
          )}
        </Card>
      ) : activeTab === "Accounts" ? (
        <Card className="p-6">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Assigned Accounts & Credentials
              </h2>
              <p className="text-xs text-muted-foreground">
                Company-provided accounts and employee-submitted credentials.
              </p>
            </div>
            {canManageAssets && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setRequestCredOpen(true)}
                >
                  <Send className="h-3.5 w-3.5 text-primary" /> Request
                  Credential
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setAddCredOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Company Account
                </Button>
              </div>
            )}
          </div>

          {credentialsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading credentials...
            </p>
          ) : credentialsQuery.data?.rows?.length ? (
            <div className="divide-y rounded-lg border">
              {credentialsQuery.data.rows.map((cred: CredentialDto) => (
                <div
                  key={cred.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">
                        {cred.label}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {cred.credential_type?.name}
                      </Badge>
                      {cred.provided_by === PROVIDED_BY.COMPANY ? (
                        <Badge
                          variant="outline"
                          className="text-blue-600 border-blue-300 text-xs"
                        >
                          Company
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-purple-600 border-purple-300 text-xs"
                        >
                          Employee
                        </Badge>
                      )}
                      {cred.approval_status ===
                      CREDENTIAL_APPROVAL_STATUS.APPROVED ? (
                        <Badge variant="success" className="text-xs">
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-xs">
                          Pending Review
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 font-mono">
                      <span>Username: {cred.username}</span>
                      {cred.url && (
                        <a
                          href={cred.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-sans"
                        >
                          (Portal URL)
                        </a>
                      )}
                    </div>
                  </div>

                  <RowActionsMenu
                    label="Account actions"
                    actions={[
                      {
                        key: "reveal",
                        label: "Reveal secret",
                        icon: Eye,
                        onSelect: () => setRevealingCred(cred),
                      },
                      {
                        key: "rotate",
                        label: "Rotate password",
                        icon: RefreshCw,
                        onSelect: () => setRotatingCred(cred),
                      },
                      {
                        key: "history",
                        label: "Audit history",
                        icon: History,
                        onSelect: () => setHistoryCred(cred),
                      },
                      ...(canManageAssets
                        ? [
                            {
                              key: "delete",
                              label: "Revoke & Delete",
                              icon: Trash2,
                              destructive: true,
                              separatorBefore: true,
                              onSelect: () => setDeletingCred(cred),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No credentials registered"
              description="No accounts or login secrets are currently associated with this employee."
            />
          )}
        </Card>
      ) : activeTab === "Requests" ? (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Hardware & Software Requests
            </h2>
            <Link
              to={PATHS.REQUESTS}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-card px-3 text-[13px] font-medium hover:bg-muted"
            >
              View All Requests
            </Link>
          </div>
          {employeeRequestsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading requests…</p>
          ) : employeeRequestsQuery.data?.list?.length ? (
            <div className="space-y-3">
              {employeeRequestsQuery.data.list.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={PATHS.REQUEST_DETAIL.replace(":id", String(req.id))}
                        className="font-semibold text-primary hover:underline text-sm"
                      >
                        {req.request_no}
                      </Link>
                      <Badge variant="outline" className="text-xs">
                        {REQUEST_TYPE_LABELS[req.request_type]}
                      </Badge>
                      <Badge
                        variant={REQUEST_STATUS_TONES[req.request_status]}
                        className="text-xs font-medium"
                      >
                        {REQUEST_STATUS_LABELS[req.request_status]}
                      </Badge>
                      <Badge
                        variant={REQUEST_PRIORITY_TONES[req.priority]}
                        className="text-xs"
                      >
                        {REQUEST_PRIORITY_LABELS[req.priority]}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground font-medium truncate">
                      {req.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted: {new Date(req.createdAt).toLocaleDateString()}
                      {req.needed_by_date
                        ? ` · Needed by: ${new Date(req.needed_by_date).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <Link
                    to={PATHS.REQUEST_DETAIL.replace(":id", String(req.id))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted text-foreground transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No requests raised"
              description="This employee has not submitted any hardware or software requests."
            />
          )}
        </Card>
      ) : activeTab === "Activity" ? (
        <Card className="p-6">
          <h2 className="mb-6 text-base font-semibold text-foreground">
            Activity Timeline
          </h2>
          {activityQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading activity history…
            </p>
          ) : activityQuery.isError ? (
            <p className="text-sm text-danger">
              {activityQuery.error instanceof Error
                ? activityQuery.error.message
                : "Unable to load activity logs"}
            </p>
          ) : activityQuery.data?.length ? (
            <Timeline
              items={activityQuery.data.map((entry, idx): TimelineItem => ({
                id: (entry.id as string | number) ?? idx,
                title: String(
                  entry.description || entry.action || "Employee profile event",
                ),
                description: entry.activity_type
                  ? `Type: ${String(entry.activity_type)}`
                  : undefined,
                time: entry.createdAt
                  ? new Date(String(entry.createdAt)).toLocaleString()
                  : "—",
              }))}
            />
          ) : (
            <EmptyState
              title="No activity recorded"
              description="No activity log entries have been recorded for this employee yet."
            />
          )}
        </Card>
      ) : (
        <Card className="p-6">
          <EmptyState
            title="No credentials or accounts"
            description="External logins and assigned service accounts will appear here once configured."
          />
        </Card>
      )}

      <AddEditCredential
        open={addCredOpen}
        onOpenChange={setAddCredOpen}
        credential={null}
        defaultEmployeeId={Number(id)}
      />

      <CreateCollectionRequestDialog
        open={requestCredOpen}
        onOpenChange={setRequestCredOpen}
        defaultEmployeeId={Number(id)}
      />

      <RevealSecretDialog
        open={Boolean(revealingCred)}
        onOpenChange={(o) => !o && setRevealingCred(null)}
        credential={revealingCred}
      />

      <RotatePasswordDialog
        open={Boolean(rotatingCred)}
        onOpenChange={(o) => !o && setRotatingCred(null)}
        credential={rotatingCred}
      />

      <CredentialHistoryDialog
        open={Boolean(historyCred)}
        onOpenChange={(o) => !o && setHistoryCred(null)}
        credential={historyCred}
      />

      <ConfirmDialog
        open={Boolean(deletingCred)}
        onOpenChange={(o) => !o && setDeletingCred(null)}
        title="Revoke / Delete Credential"
        description={`Are you sure you want to delete credential "${deletingCred?.label}"? This action is permanent and logged in the immutable audit trail.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (deletingCred) {
            await deleteCredMutation.mutateAsync(deletingCred.id);
            setDeletingCred(null);
          }
        }}
      />
    </div>
  );
}
