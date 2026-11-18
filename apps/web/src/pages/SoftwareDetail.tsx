import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Plus,
  UserCheck,
  Layers,
  KeyRound,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/States";
import { ReferenceLabel } from "@/components/common/ReferenceLabel";
import {
  KeyValueList,
  Timeline,
  type TimelineItem,
} from "@/components/common/DataDisplay";
import { TabsList } from "@/components/ui/tabs";
import { CommonTable } from "@/components/common/CommonTable";
import { useTableState } from "@/hooks/use-tableState";
import {
  useSoftware,
  useSoftwareUsage,
  useSoftwareActivity,
  useSoftwareLicenses,
} from "@/hooks/queries/software";
import { AddEditSoftware } from "@/components/software/AddEditSoftware";
import { AssignSoftwareDialog } from "@/components/software/AssignSoftwareDialog";
import { AddEditLicenseDialog } from "@/components/software/AddEditLicenseDialog";
import { RevokeSoftwareDialog } from "@/components/software/RevokeSoftwareDialog";
import { getLicenseColumns } from "@/components/software/LicenseColumns";
import { PATHS } from "@/routes/paths";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";
import type { SoftwareAssignment } from "@/api/software";
import type { FilterField } from "@/components/common/TableFilters/types";

const tabs = ["Overview", "Licenses", "Assigned users", "Activity"] as const;
type Tab = (typeof tabs)[number];

const licenseFilters: FilterField[] = [
  { key: "expiry_date", label: "Expiry date", type: "daterange" },
  { key: "has_available_seats", label: "Has available seats", type: "boolean" },
];

export function SoftwareDetail() {
  const { id = "" } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const { tableState, setTableState } = useTableState();

  // Modals state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [addLicenseOpen, setAddLicenseOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<SoftwareAssignment | null>(
    null,
  );

  // User & permissions
  const currentUser = useAuthStore((state) => state.user);
  const role = getUserRole(currentUser);
  const permissions = usePermissionStore(
    (state) => state.modulePermissions["software"],
  );
  const canWrite =
    role === "admin" ||
    role === "hardware" ||
    permissions?.write_access === true;
  const canDelete =
    role === "admin" ||
    role === "hardware" ||
    permissions?.delete_access === true;

  // Queries
  const query = useSoftware(id);
  const software = query.data;
  const softwareId = Number(id);

  const licensesQuery = useSoftwareLicenses(
    softwareId,
    tableState.filters,
    activeTab === "Licenses",
  );
  const usageQuery = useSoftwareUsage(
    softwareId,
    activeTab === "Assigned users",
  );
  const activityQuery = useSoftwareActivity(
    softwareId,
    activeTab === "Activity",
  );
  const licenseColumns = useMemo(
    () =>
      getLicenseColumns({
        canDelete,
      }),
    [canDelete],
  );

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (query.isError || !software) {
    return (
      <Card className="p-8 text-center text-sm text-danger" role="alert">
        {query.error?.message ?? "Software not found"}
        <div className="mt-4">
          <Link to={PATHS.SOFTWARE}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to software
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  const seatsUsed = software.seats_used ?? 0;
  const seatsTotal = software.seats_total;
  const seatRatio = seatsTotal ? seatsUsed / seatsTotal : 0;
  const seatTone =
    seatRatio >= 1 ? "danger" : seatRatio >= 0.8 ? "warning" : "success";

  const overviewItems = [
    { label: "Application Name", value: software.name },
    {
      label: "Category",
      value: (
        <Badge variant="muted" className="capitalize text-xs">
          {software.category}
        </Badge>
      ),
    },
    {
      label: "License Type",
      value: (
        <span className="capitalize text-xs">
          {software.license_type.replaceAll("_", " ")}
        </span>
      ),
    },
    {
      label: "Supplier Vendor",
      value: software.vendor_id ? (
        <ReferenceLabel endpoint="vendor/options" id={software.vendor_id} />
      ) : (
        "Direct / Open Source"
      ),
    },
    {
      label: "Subscription Cost",
      value:
        software.cost != null
          ? `$${Number(software.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
          : "—",
    },
    {
      label: "Billing Cycle",
      value: software.billing_cycle || "Annual",
    },
    {
      label: "Renewal Date",
      value: software.renewal_date
        ? new Date(software.renewal_date).toLocaleDateString()
        : "—",
    },
    {
      label: "Seats Allocated",
      value: `${seatsUsed} seats used`,
    },
    {
      label: "Available Capacity",
      value: seatsTotal
        ? `${software.seats_available ?? 0} seats left`
        : "Unlimited",
    },
  ];

  return (
    <>
      <PageHeader
        title={software.name}
        description={`${software.category} · ${software.license_type.replaceAll("_", " ")}`}
        breadcrumbs={[
          { label: "Software", to: PATHS.SOFTWARE },
          { label: software.name },
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link to={PATHS.SOFTWARE}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to software
              </Button>
            </Link>
            {canWrite && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDrawerOpen(true)}
                >
                  <Edit className="mr-1.5 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddLicenseOpen(true)}
                >
                  <KeyRound className="mr-1.5 h-4 w-4" />
                  Add license tier
                </Button>
                <Button size="sm" onClick={() => setAssignOpen(true)}>
                  <UserCheck className="mr-1.5 h-4 w-4" />
                  Assign license
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Hero Header Card */}
      <Card className="mb-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Layers className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {software.name}
                </h1>
                <Badge variant="muted" className="capitalize text-xs">
                  {software.category}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground capitalize">
                License model: {software.license_type.replaceAll("_", " ")}
                {software.billing_cycle
                  ? ` · ${software.billing_cycle} billing`
                  : ""}
              </p>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 text-xs sm:text-right">
            <span className="text-muted-foreground">Seat utilization:</span>
            <div className="mt-1 flex items-center gap-2 sm:justify-end">
              <Badge variant={seatTone} className="text-xs">
                {seatsTotal
                  ? `${seatsUsed} / ${seatsTotal}`
                  : `${seatsUsed} assigned`}
              </Badge>
              {seatsTotal && (
                <span className="font-semibold text-foreground">
                  ({Math.round(seatRatio * 100)}%)
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <TabsList
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as Tab)}
      />

      {/* Tab Panels */}
      {activeTab === "Overview" ? (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold text-foreground">
              Application Details
            </h2>
            <KeyValueList items={overviewItems} />

            {software.notes && (
              <div className="mt-6 border-t pt-5">
                <h3 className="mb-1 text-sm font-semibold text-foreground">
                  Terms & Notes
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {software.notes}
                </p>
              </div>
            )}
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground">
                  Seat Capacity
                </h2>
                {canWrite && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddLicenseOpen(true)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add seats
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Used seats</span>
                  <span className="font-semibold">{seatsUsed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Available seats</span>
                  <span className="font-semibold">
                    {seatsTotal ? (software.seats_available ?? 0) : "Unlimited"}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">
                    Total contracted
                  </span>
                  <span className="font-semibold">
                    {seatsTotal ?? "Unlimited (Enterprise)"}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 text-base font-semibold text-foreground">
                Subscription Lifecycle
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Renewal Date</dt>
                  <dd className="font-medium">
                    {software.renewal_date
                      ? new Date(software.renewal_date).toLocaleDateString()
                      : "No renewal scheduled"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Billing Schedule</dt>
                  <dd className="font-medium capitalize">
                    {software.billing_cycle || "Perpetual / Annual"}
                  </dd>
                </div>
              </dl>
              {canWrite && (
                <div className="mt-4 border-t pt-3">
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => setAssignOpen(true)}
                  >
                    <UserCheck className="mr-1.5 h-4 w-4" />
                    Assign to Employee
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : activeTab === "Licenses" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canWrite && (
              <Button size="sm" onClick={() => setAddLicenseOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add license tier
              </Button>
            )}
          </div>
          <CommonTable
            columns={licenseColumns}
            rows={licensesQuery.data ?? []}
            count={licensesQuery.data?.length ?? 0}
            query={tableState}
            onQueryChange={setTableState}
            loading={licensesQuery.isLoading}
            error={licensesQuery.error?.message}
            onRetry={() => void licensesQuery.refetch()}
            filterFields={licenseFilters}
            emptyTitle="No license keys or tiers registered"
          />
        </div>
      ) : activeTab === "Assigned users" ? (
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            Current License Users
          </h2>
          {usageQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading assigned users…
            </p>
          ) : usageQuery.isError ? (
            <p className="text-sm text-danger">{usageQuery.error?.message}</p>
          ) : usageQuery.data?.length ? (
            <div className="divide-y rounded-lg border">
              {usageQuery.data.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">
                        {assignment.employee?.first_name}{" "}
                        {assignment.employee?.last_name}
                      </p>
                      {assignment.employee?.employee_code && (
                        <span className="text-xs text-muted-foreground">
                          ({assignment.employee.employee_code})
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          assignment.revoked_at
                            ? "bg-muted text-muted-foreground"
                            : "bg-success/10 text-success"
                        }`}
                      >
                        {assignment.revoked_at ? "Revoked" : "Active Access"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Assigned:{" "}
                      {assignment.assigned_at
                        ? new Date(assignment.assigned_at).toLocaleDateString()
                        : "—"}
                      {assignment.revoked_at &&
                        ` · Revoked: ${new Date(assignment.revoked_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  {canWrite && !assignment.revoked_at && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRevokeTarget(assignment)}
                    >
                      Revoke Access
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No assigned users"
              description="No employees currently hold active licenses for this application."
              action={
                canWrite ? (
                  <Button size="sm" onClick={() => setAssignOpen(true)}>
                    <UserCheck className="mr-1.5 h-4 w-4" />
                    Assign Employee
                  </Button>
                ) : undefined
              }
            />
          )}
        </Card>
      ) : (
        /* Activity Tab */
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
              {activityQuery.error?.message}
            </p>
          ) : activityQuery.data?.length ? (
            <Timeline
              items={activityQuery.data.map((entry, idx): TimelineItem => ({
                id: (entry.id as string | number) ?? idx,
                title: String(entry.action || "Software updated"),
                description:
                  (entry.description as string) ||
                  (entry.note as string) ||
                  undefined,
                time: entry.createdAt
                  ? new Date(String(entry.createdAt)).toLocaleString()
                  : "—",
              }))}
            />
          ) : (
            <EmptyState
              title="No activity recorded"
              description="Audit actions and license updates will appear here."
            />
          )}
        </Card>
      )}

      {/* Drawers & Dialogs */}
      <AddEditSoftware
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        software={software}
      />

      <AssignSoftwareDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        software={software}
      />

      <AddEditLicenseDialog
        open={addLicenseOpen}
        onOpenChange={setAddLicenseOpen}
        softwareId={softwareId}
        softwareName={software.name}
      />

      <RevokeSoftwareDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        assignment={revokeTarget}
      />
    </>
  );
}
