import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useParams } from "react-router-dom";
import { useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Mail,
  MapPin,
  UserRound,
} from "lucide-react";
import { getResource } from "@/api/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/States";
import { PageHeader } from "@/components/common/PageHeader";
import { PATHS } from "@/routes/paths";
import { Link } from "react-router-dom";
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

const tabs = [
  "Overview",
  "Hardware",
  "Software",
  "Accounts",
  "Activity",
] as const;
type Tab = (typeof tabs)[number];
interface EmployeeDetails {
  id: string | number;
  first_name: string;
  last_name?: string;
  email: string;
  employee_code?: string;
  department_id?: number;
  designation_id?: number;
  location_id?: number;
  employment_status?: number;
  join_date?: string;
  name?: string;
}

export function EmployeeDetail() {
  const { id = "" } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const client = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const canManageAssets = ["admin", "hardware"].includes(getUserRole(currentUser));
  const assetRows = useQuery({
    queryKey: ["employee-assets", id],
    enabled: activeTab === "Hardware",
    queryFn: async () => { const result = await callApi<AssignmentRecord[]>({ url: endPoints.employeeAssets(id), method: api_methods.GET }); if (!result.ok) throw new Error(result.message); return result.data ?? []; },
  });
  const softwareRows = useQuery({
    queryKey: ["employee-software", id],
    enabled: activeTab === "Software",
    queryFn: async () => { const result = await callApi<SoftwareAssignment[]>({ url: endPoints.employeeSoftware(id), method: api_methods.GET }); if (!result.ok) throw new Error(result.message); return result.data ?? []; },
  });
  const returnAsset = useMutation({
    mutationFn: async (assetId: number) => { const result = await assetsApi.returnAsset({ asset_id: assetId }); if (!result.ok) throw new Error(result.message); },
    onSuccess: () => { toast.success("Asset returned"); void client.invalidateQueries({ queryKey: ["employee-assets", id] }); },
    onError: (error) => toast.error(error.message),
  });
  const revokeSoftware = useMutation({
    mutationFn: async (assignmentId: number) => { const result = await softwareApi.revoke(assignmentId); if (!result.ok) throw new Error(result.message); },
    onSuccess: () => { toast.success("Software access revoked"); void client.invalidateQueries({ queryKey: ["employee-software", id] }); },
    onError: (error) => toast.error(error.message),
  });
  const query = useQuery({
    queryKey: ["employees", "detail", id],
    queryFn: async () => {
      const result = await getResource<EmployeeDetails>(
        endPoints.employee.getById(id),
      );
      if (!result.ok || !result.data)
        throw new Error(result.message || "Employee not found");
      return result.data;
    },
  });
  const employee = query.data;
  if (query.isLoading)
    return (
      <div className="animate-pulse rounded-xl border bg-card p-8 text-sm text-muted-foreground">
        Loading employee profile…
      </div>
    );
  if (query.isError)
    return (
      <Card className="p-8 text-sm text-danger" role="alert">
        {query.error.message}
      </Card>
    );
  if (!employee) return null;
  const employmentStatus =
    ENUMS.employmentStatus.find(
      (option) => option.value === String(employee.employment_status ?? 1),
    )?.label ?? "Unknown";
  const fullName = `${employee.first_name} ${employee.last_name ?? ""}`.trim();
  return (
    <>
      <PageHeader
        title={fullName}
        description="Employee profile"
        breadcrumbs={[
          { label: "Employees", to: PATHS.EMPLOYEES },
          { label: fullName },
        ]}
        action={
          <Link to={PATHS.EMPLOYEES}>
            <Button variant="outline">
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
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                {employee.first_name[0]}
                {employee.last_name?.[0]}
              </div>
              <div>
                <h2 className="font-semibold">{fullName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {employee.employee_code ?? "Employee"}
                </p>
              </div>
              <Badge className="ml-auto" variant="success">
                {employmentStatus}
              </Badge>
            </div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              {[
                { Icon: Mail, label: "Work email", value: employee.email },
                {
                  Icon: BriefcaseBusiness,
                  label: "Department",
                  value: (
                    <ReferenceLabel
                      endpoint="department/options"
                      id={employee.department_id}
                    />
                  ),
                },
                {
                  Icon: UserRound,
                  label: "Designation",
                  value: (
                    <ReferenceLabel
                      endpoint="designation/options"
                      id={employee.designation_id}
                    />
                  ),
                },
                {
                  Icon: MapPin,
                  label: "Location",
                  value: (
                    <ReferenceLabel
                      endpoint="location/options"
                      id={employee.location_id}
                    />
                  ),
                },
              ].map(({ Icon, label, value }) => {
                return (
                  <div className="flex gap-3" key={String(label)}>
                    <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {String(label)}
                      </p>
                      <p className="mt-1 text-sm font-medium">{value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-sm font-semibold">Employment</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Start date</dt>
                <dd>{employee.join_date ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Employee ID</dt>
                <dd>{employee.employee_code ?? "—"}</dd>
              </div>
            </dl>
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
            <p className="text-sm text-muted-foreground">Loading hardware records…</p>
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
                        to={PATHS.ASSET_DETAIL.replace(":id", String(assignment.asset?.id ?? assignment.asset_id))}
                        className="font-medium text-primary hover:underline"
                      >
                        {assignment.asset?.asset_tag ?? `Asset #${assignment.asset_id}`}
                      </Link>
                      <AssetStatusBadge status={assignment.asset?.asset_status} />
                      <Badge
                        variant={assignment.returned_at ? "muted" : "success"}
                        className="text-xs"
                      >
                        {assignment.returned_at ? "Returned" : "Active Custody"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[assignment.asset?.brand, assignment.asset?.model].filter(Boolean).join(" ")}
                      {assignment.due_return_date ? ` · Due: ${new Date(assignment.due_return_date).toLocaleDateString()}` : ""}
                      {assignment.returned_at ? ` · Returned: ${new Date(assignment.returned_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  {canManageAssets && !assignment.returned_at && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={returnAsset.isPending}
                      onClick={() => returnAsset.mutate(Number(assignment.asset_id))}
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
            <p className="text-sm text-muted-foreground">Loading software access…</p>
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
                        to={PATHS.SOFTWARE_DETAIL.replace(":id", String(assignment.software?.id ?? assignment.software_id))}
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
                      Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                      {assignment.revoked_at ? ` · Revoked: ${new Date(assignment.revoked_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  {canManageAssets && !assignment.revoked_at && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={revokeSoftware.isPending}
                      onClick={() => revokeSoftware.mutate(Number(assignment.id))}
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
      ) : (
        <Card><EmptyState title="Tab unavailable" description="This tab will show its records when they are enabled." /></Card>
      )}
    </>
  );
}
