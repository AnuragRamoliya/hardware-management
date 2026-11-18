import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  QrCode,
  RotateCcw,
  UserCheck,
  Wrench,
  Laptop,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/States";
import { ReferenceLabel } from "@/components/common/ReferenceLabel";
import { KeyValueList, Timeline, type TimelineItem } from "@/components/common/DataDisplay";
import { TabsList } from "@/components/ui/tabs";
import { AssetStatusBadge } from "@/components/assets/AssetStatusBadge";
import { AddEditAsset } from "@/components/assets/AddEditAsset";
import { AssignAssetDialog } from "@/components/assets/AssignAssetDialog";
import { ReturnAssetDialog } from "@/components/assets/ReturnAssetDialog";
import { AssetQrModal } from "@/components/assets/AssetQrModal";
import { AddEditMaintenance } from "@/components/maintenance/AddEditMaintenance";
import {
  useAsset,
  useAssetHistory,
  useAssetMaintenance,
  useAssetActivity,
  useUpdateAsset,
} from "@/hooks/queries/assets";
import { ASSET_CONDITIONS } from "@/utils/constants";
import { PATHS } from "@/routes/paths";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";

const tabs = [
  "Overview",
  "Assignment history",
  "Maintenance",
  "Accessories",
  "Activity",
] as const;
type Tab = (typeof tabs)[number];

export function AssetDetail() {
  const { id = "" } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const queryClient = useQueryClient();

  // Modals / Drawers state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);

  // User & permissions
  const currentUser = useAuthStore((state) => state.user);
  const role = getUserRole(currentUser);
  const permissions = usePermissionStore((state) => state.modulePermissions["asset"]);
  const canWrite = role === "admin" || role === "hardware" || permissions?.write_access === true;

  // Queries
  const query = useAsset(id);
  const historyQuery = useAssetHistory(id, activeTab === "Assignment history");
  const maintenanceQuery = useAssetMaintenance(id, activeTab === "Maintenance");
  const activityQuery = useAssetActivity(id, activeTab === "Activity");
  const updateMutation = useUpdateAsset();

  const asset = query.data;

  const toggleRetireStatus = async () => {
    if (!asset) return;
    const newStatus = asset.asset_status === 5 ? 1 : 5;
    try {
      await updateMutation.mutateAsync({
        id: asset.id,
        asset_status: newStatus,
      });
      toast.success(newStatus === 5 ? "Asset retired" : "Asset restored to available");
      void queryClient.invalidateQueries({ queryKey: ["assets", "detail", String(asset.id)] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update asset status");
    }
  };

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (query.isError || !asset) {
    return (
      <Card className="p-8 text-center text-sm text-danger" role="alert">
        {query.error?.message ?? "Asset not found"}
        <div className="mt-4">
          <Link to={PATHS.ASSETS}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to assets
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  const isAssigned = asset.asset_status === 2;
  const isAvailable = asset.asset_status === 1;
  const conditionLabel =
    ASSET_CONDITIONS.find((c) => c.value === asset.condition)?.label ??
    asset.condition ??
    "—";

  const overviewItems = [
    { label: "Asset Tag", value: asset.asset_tag },
    { label: "Serial Number", value: asset.serial_no ?? "—" },
    {
      label: "Category",
      value: (
        <ReferenceLabel endpoint="asset_category/options" id={asset.category_id} />
      ),
    },
    { label: "Brand", value: asset.brand ?? "—" },
    { label: "Model", value: asset.model ?? "—" },
    {
      label: "Location",
      value: (
        <ReferenceLabel endpoint="location/options" id={asset.location_id} />
      ),
    },
    { label: "Condition", value: conditionLabel },
    {
      label: "Parent Asset",
      value: asset.parent_asset_id ? (
        <ReferenceLabel endpoint="asset/options" id={asset.parent_asset_id} />
      ) : (
        "None (Primary Equipment)"
      ),
    },
    {
      label: "Supplier Vendor",
      value: (
        <ReferenceLabel endpoint="vendor/options" id={asset.vendor_id} />
      ),
    },
    { label: "Purchase Date", value: asset.purchase_date ?? "—" },
    {
      label: "Purchase Cost",
      value:
        asset.purchase_cost != null
          ? `$${Number(asset.purchase_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
          : "—",
    },
    { label: "Warranty End", value: asset.warranty_end ?? "—" },
  ];

  return (
    <>
      <PageHeader
        title={asset.asset_tag}
        description={[asset.brand, asset.model].filter(Boolean).join(" ") || "Hardware asset record"}
        breadcrumbs={[
          { label: "Assets", to: PATHS.ASSETS },
          { label: asset.asset_tag },
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link to={PATHS.ASSETS}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to assets
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQrOpen(true)}
            >
              <QrCode className="mr-1.5 h-4 w-4" />
              QR Label
            </Button>
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
                {isAvailable && (
                  <Button
                    size="sm"
                    onClick={() => setAssignOpen(true)}
                  >
                    <UserCheck className="mr-1.5 h-4 w-4" />
                    Assign
                  </Button>
                )}
                {isAssigned && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReturnOpen(true)}
                  >
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    Return
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  loading={updateMutation.isPending}
                  onClick={toggleRetireStatus}
                >
                  {asset.asset_status === 5 ? "Restore asset" : "Retire asset"}
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
              <Laptop className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {asset.asset_tag}
                </h1>
                <AssetStatusBadge status={asset.asset_status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {[asset.brand, asset.model].filter(Boolean).join(" ") || "Hardware equipment"}
                {asset.serial_no ? ` · S/N: ${asset.serial_no}` : ""}
              </p>
            </div>
          </div>
          {asset.current_assignment?.employee && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs sm:text-right">
              <span className="text-muted-foreground">Currently assigned to:</span>
              <p className="font-semibold text-foreground">
                {asset.current_assignment.employee.first_name}{" "}
                {asset.current_assignment.employee.last_name}
              </p>
              <p className="text-muted-foreground">
                {asset.current_assignment.employee.employee_code}
              </p>
            </div>
          )}
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
              Equipment Details
            </h2>
            <KeyValueList items={overviewItems} />

            {/* Specifications if available */}
            {asset.specs && typeof asset.specs === "object" && Object.keys(asset.specs).length > 0 && (
              <div className="mt-6 border-t pt-5">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Technical Specifications
                </h3>
                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  {Object.entries(asset.specs as Record<string, unknown>).map(
                    ([k, v]) => (
                      <div key={k} className="rounded-md border bg-muted/30 p-2.5">
                        <dt className="text-xs text-muted-foreground">{k}</dt>
                        <dd className="mt-0.5 font-medium text-foreground">
                          {String(v ?? "—")}
                        </dd>
                      </div>
                    ),
                  )}
                </dl>
              </div>
            )}

            {/* Notes if available */}
            {asset.notes && (
              <div className="mt-6 border-t pt-5">
                <h3 className="mb-1 text-sm font-semibold text-foreground">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {asset.notes}
                </p>
              </div>
            )}
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="mb-4 text-base font-semibold text-foreground">
                Current Custody
              </h2>
              {asset.current_assignment?.employee ? (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Assignee</p>
                    <p className="mt-1 text-base font-semibold text-foreground">
                      {asset.current_assignment.employee.first_name}{" "}
                      {asset.current_assignment.employee.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {asset.current_assignment.employee.email} · ID:{" "}
                      {asset.current_assignment.employee.employee_code}
                    </p>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Assigned on</dt>
                      <dd className="font-medium">
                        {asset.current_assignment.assigned_at
                          ? new Date(asset.current_assignment.assigned_at).toLocaleDateString()
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Due return date</dt>
                      <dd className="font-medium">
                        {asset.current_assignment.due_return_date
                          ? new Date(asset.current_assignment.due_return_date).toLocaleDateString()
                          : "Permanent allocation"}
                      </dd>
                    </div>
                    {asset.current_assignment.note && (
                      <div className="border-t pt-2">
                        <dt className="text-xs text-muted-foreground">Note</dt>
                        <dd className="mt-1 text-xs text-foreground">
                          {asset.current_assignment.note}
                        </dd>
                      </div>
                    )}
                  </dl>
                  {canWrite && (
                    <div className="border-t pt-3">
                      <Button
                        variant="outline"
                        className="w-full"
                        size="sm"
                        onClick={() => setReturnOpen(true)}
                      >
                        <RotateCcw className="mr-1.5 h-4 w-4" />
                        Initiate Return
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  title="In Stock / Unassigned"
                  description="This asset is not currently checked out to any employee."
                  action={
                    canWrite && isAvailable ? (
                      <Button size="sm" onClick={() => setAssignOpen(true)}>
                        <UserCheck className="mr-1.5 h-4 w-4" />
                        Assign Asset
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 text-base font-semibold text-foreground">
                Lifecycle & Maintenance
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Current Status</dt>
                  <dd>
                    <AssetStatusBadge status={asset.asset_status} />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Condition Rating</dt>
                  <dd className="font-medium">{conditionLabel}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Warranty Coverage</dt>
                  <dd className="font-medium">
                    {asset.warranty_end
                      ? new Date(asset.warranty_end) > new Date()
                        ? `Valid until ${new Date(asset.warranty_end).toLocaleDateString()}`
                        : "Expired"
                      : "No warranty recorded"}
                  </dd>
                </div>
              </dl>
              {canWrite && (
                <div className="mt-4 border-t pt-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={() => setMaintenanceOpen(true)}
                  >
                    <Wrench className="mr-1.5 h-4 w-4" />
                    Log Maintenance Service
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : activeTab === "Assignment history" ? (
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            Assignment Audit Trail
          </h2>
          {historyQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading history records…</p>
          ) : historyQuery.isError ? (
            <p className="text-sm text-danger">{historyQuery.error?.message}</p>
          ) : historyQuery.data?.length ? (
            <div className="divide-y rounded-lg border">
              {historyQuery.data.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">
                        {record.employee
                          ? `${record.employee.first_name} ${record.employee.last_name}`
                          : `Employee #${record.employee_id}`}
                      </p>
                      {record.employee?.employee_code && (
                        <span className="text-xs text-muted-foreground">
                          ({record.employee.employee_code})
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          record.returned_at
                            ? "bg-muted text-muted-foreground"
                            : "bg-success/10 text-success"
                        }`}
                      >
                        {record.returned_at ? "Returned" : "Active Custody"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Assigned:{" "}
                      {record.assigned_at
                        ? new Date(record.assigned_at).toLocaleDateString()
                        : "—"}
                      {record.returned_at &&
                        ` · Returned: ${new Date(record.returned_at).toLocaleDateString()}`}
                      {record.due_return_date &&
                        ` · Due: ${new Date(record.due_return_date).toLocaleDateString()}`}
                    </p>
                    {record.note && (
                      <p className="mt-1 text-xs text-muted-foreground italic">
                        "{record.note}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No assignment history"
              description="This asset has not been assigned to any employee yet."
            />
          )}
        </Card>
      ) : activeTab === "Maintenance" ? (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Repair & Service Log
            </h2>
            {canWrite && (
              <Button size="sm" onClick={() => setMaintenanceOpen(true)}>
                <Wrench className="mr-1.5 h-4 w-4" />
                Add Record
              </Button>
            )}
          </div>
          {maintenanceQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading maintenance log…</p>
          ) : maintenanceQuery.isError ? (
            <p className="text-sm text-danger">{maintenanceQuery.error?.message}</p>
          ) : maintenanceQuery.data?.length ? (
            <div className="divide-y rounded-lg border">
              {maintenanceQuery.data.map((record) => (
                <div key={String(record.id)} className="p-4">
                  <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                    <p className="font-medium text-foreground">
                      {String(record.issue || "Maintenance Service")}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      Dispatched:{" "}
                      {record.sent_at
                        ? new Date(String(record.sent_at)).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {record.vendor_id ? (
                      <>
                        Vendor:{" "}
                        <ReferenceLabel
                          endpoint="vendor/options"
                          id={record.vendor_id as number}
                        />
                      </>
                    ) : null}
                    {record.cost != null && ` · Cost: $${Number(record.cost).toFixed(2)}`}
                    {record.returned_at ? (
                      <span> · Completed: {new Date(String(record.returned_at)).toLocaleDateString()}</span>
                    ) : null}
                  </p>
                  {record.resolution ? (
                    <p className="mt-1.5 text-xs text-foreground bg-muted/40 p-2 rounded">
                      Resolution: {String(record.resolution)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No maintenance records"
              description="This equipment has never required repair or maintenance servicing."
            />
          )}
        </Card>
      ) : activeTab === "Accessories" ? (
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            Attached Accessories & Peripherals
          </h2>
          {asset.accessories?.length ? (
            <div className="divide-y rounded-lg border">
              {asset.accessories.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <Link
                      to={PATHS.ASSET_DETAIL.replace(":id", String(acc.id))}
                      className="font-medium text-primary hover:underline"
                    >
                      {acc.asset_tag}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[acc.brand, acc.model].filter(Boolean).join(" ") || "Accessory"}
                      {acc.serial_no ? ` · S/N: ${acc.serial_no}` : ""}
                    </p>
                  </div>
                  <AssetStatusBadge status={acc.asset_status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No accessories attached"
              description="Secondary equipment (monitors, keyboards, docks) linked to this parent asset will appear here."
            />
          )}
        </Card>
      ) : (
        /* Activity Tab with Shared Timeline */
        <Card className="p-6">
          <h2 className="mb-6 text-base font-semibold text-foreground">
            Activity Timeline
          </h2>
          {activityQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading activity history…</p>
          ) : activityQuery.isError ? (
            <p className="text-sm text-danger">{activityQuery.error?.message}</p>
          ) : activityQuery.data?.length ? (
            <Timeline
              items={activityQuery.data.map(
                (entry, idx): TimelineItem => ({
                  id: (entry.id as string | number) ?? idx,
                  title: String(entry.action || "System action"),
                  description:
                    (entry.note as string) ||
                    (entry.description as string) ||
                    undefined,
                  time: entry.createdAt
                    ? new Date(String(entry.createdAt)).toLocaleString()
                    : "—",
                }),
              )}
            />
          ) : (
            <EmptyState
              title="No activity recorded"
              description="Audit actions and change records will appear here."
            />
          )}
        </Card>
      )}

      {/* Drawers & Dialogs */}
      <AddEditAsset
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        asset={asset}
      />

      <AssetQrModal
        open={qrOpen}
        onOpenChange={setQrOpen}
        asset={asset}
      />

      <AssignAssetDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        asset={asset}
      />

      <ReturnAssetDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        asset={asset}
      />

      <AddEditMaintenance
        open={maintenanceOpen}
        onOpenChange={setMaintenanceOpen}
        initialAssetId={Number(asset.id)}
      />
    </>
  );
}
