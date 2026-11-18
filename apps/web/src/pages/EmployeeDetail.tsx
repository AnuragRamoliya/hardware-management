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
import { ENUMS } from "@/utils/constants";
import { callApi } from "@/api/callApi";
import { api_methods, endPoints } from "@/api/endpoint";
import type { AssignmentRecord } from "@/api/assets";
import type { SoftwareAssignment } from "@/api/software";
import { assetsApi } from "@/api/assets";
import { softwareApi } from "@/api/software";
import useAuthStore from "@/zustand/user-store";
import { getUserRole } from "@/lib/roles";
import { useEmployee, useEmployeeActivity } from "@/hooks/queries/employee";

const tabs = [
  "Overview",
  "Hardware",
  "Software",
  "Accounts",
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

  const employmentStatus =
    ENUMS.employmentStatus.find(
      (option) => option.value === String(employee.employment_status ?? 1),
    )?.label ?? "Active";

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
        <Badge
          variant={
            String(employee.employment_status) === "1" ? "success" : "muted"
          }
        >
          {employmentStatus}
        </Badge>
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
              <Badge className="ml-auto" variant="success">
                {employmentStatus}
              </Badge>
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
    </div>
  );
}
