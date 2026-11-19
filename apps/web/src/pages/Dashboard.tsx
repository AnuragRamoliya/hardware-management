import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Laptop,
  PackageCheck,
  ShieldAlert,
  UsersRound,
  CheckSquare,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { callApi } from "@/api/callApi";
import { endPoints } from "@/api/endpoint";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PATHS } from "@/routes/paths";
import {
  useCredentialApprovalsList,
  useCredentialRequestsList,
  useCredentialAccessLogsList,
} from "@/hooks/queries/credentials";
import { useRequestStats } from "@/hooks/queries/requests";
import { Inbox, UserCheck, AlertTriangle, PackageX, Clock } from "lucide-react";

type Summary = {
  totalAssets: number;
  available: number;
  assigned: number;
  inRepair: number;
  expiringWarranties: number;
  softwareCount: number;
  expiringLicenses: number;
  seatsTotal: number;
  seatsUsed: number;
  seatsAvailable: number;
};

export function Dashboard() {
  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const response = await callApi<Summary>({
        url: endPoints.dashboard,
        method: "GET",
      });
      if (!response.ok || !response.data)
        throw new Error(response.message || "Unable to load dashboard");
      return response.data;
    },
    retry: 1,
  });
  const summary = summaryQuery.data;
  const approvalsQuery = useCredentialApprovalsList({
    currentPage: 1,
    itemsPerPage: 1,
    sortBy: [],
    filters: {},
  });
  const requestsQuery = useCredentialRequestsList({
    currentPage: 1,
    itemsPerPage: 1,
    sortBy: [],
    filters: {},
  });
  const accessLogsQuery = useCredentialAccessLogsList({
    currentPage: 1,
    itemsPerPage: 1,
    sortBy: [],
    filters: {},
  });
  const { data: requestStats } = useRequestStats();

  const seatsUsedPercent = summary?.seatsTotal
    ? Math.min(100, (summary.seatsUsed / summary.seatsTotal) * 100)
    : 0;
  return (
    <>
      <PageHeader
        title="Good morning"
        description="Here’s what’s happening across your workspace."
        breadcrumbs={[{ label: "Dashboard" }]}
      />
      {summaryQuery.isError && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
        >
          Live inventory metrics are unavailable: {summaryQuery.error.message}
        </p>
      )}
      <section
        aria-label="Workspace metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Tracked assets"
          value={summary?.totalAssets ?? "—"}
          icon={<Laptop className="h-4 w-4" />}
        />
        <StatCard
          label="Available assets"
          value={summary?.available ?? "—"}
          icon={<PackageCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Assigned assets"
          value={summary?.assigned ?? "—"}
          icon={<UsersRound className="h-4 w-4" />}
        />
        <StatCard
          label="Expiring soon"
          value={
            summary
              ? summary.expiringWarranties + summary.expiringLicenses
              : "—"
          }
          icon={<ShieldAlert className="h-4 w-4" />}
        />
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">Asset availability</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Current inventory status
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ["Available", summary?.available],
              ["Assigned", summary?.assigned],
              ["In repair", summary?.inRepair],
            ].map(([label, value]) => {
              const count = typeof value === "number" ? value : 0;
              const percent = summary?.totalAssets
                ? Math.min(100, (count / summary.totalAssets) * 100)
                : 0;
              return (
                <div key={String(label)}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{label}</span>
                    <span className="text-muted-foreground">
                      {value ?? "—"}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: percent + "%" }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">Software licenses</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Seat usage across active licenses
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-semibold">
                {summary?.seatsUsed ?? "—"}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}
                  / {summary?.seatsTotal ?? "—"}
                </span>
              </p>
              <span className="text-sm text-muted-foreground">
                {summary?.seatsAvailable ?? "—"} available
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: seatsUsedPercent + "%" }}
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {summary?.softwareCount ?? "—"} software products ·{" "}
              {summary?.expiringLicenses ?? "—"} licenses expiring in 30 days
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Credential Vault Overview Section */}
      <section className="mt-6">
        <h2 className="text-base font-semibold mb-3">
          Credential Vault & Security
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            to={PATHS.CREDENTIAL_APPROVALS}
            className="group block transition-opacity hover:opacity-90"
          >
            <StatCard
              label="Pending Approvals"
              value={approvalsQuery.data?.count ?? 0}
              icon={<CheckSquare className="h-4 w-4" />}
            />
          </Link>

          <Link
            to={PATHS.CREDENTIAL_REQUESTS}
            className="group block transition-opacity hover:opacity-90"
          >
            <StatCard
              label="Open Collection Requests"
              value={requestsQuery.data?.count ?? 0}
              icon={<FileText className="h-4 w-4" />}
            />
          </Link>

          <Link
            to={PATHS.CREDENTIAL_ACCESS_LOGS}
            className="group block transition-opacity hover:opacity-90"
          >
            <StatCard
              label="Vault Access Events"
              value={accessLogsQuery.data?.count ?? 0}
              icon={<ShieldCheck className="h-4 w-4" />}
            />
          </Link>
        </div>
      </section>

      {/* Requests & Review Workflow Section */}
      <section className="mt-6 mb-8">
        <h2 className="text-base font-semibold mb-3">
          Employee Requests & Allocations
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Link
            to={PATHS.REQUESTS}
            className="group block transition-opacity hover:opacity-90"
          >
            <StatCard
              label="Open Requests"
              value={requestStats?.metrics.open_requests ?? 0}
              icon={<Inbox className="h-4 w-4" />}
            />
          </Link>

          <Link
            to={PATHS.REQUESTS}
            className="group block transition-opacity hover:opacity-90"
          >
            <StatCard
              label="My Review Queue"
              value={requestStats?.metrics.my_queue ?? 0}
              icon={<UserCheck className="h-4 w-4" />}
            />
          </Link>

          <Link
            to={PATHS.REQUESTS}
            className="group block transition-opacity hover:opacity-90"
          >
            <StatCard
              label="SLA Breached"
              value={requestStats?.metrics.sla_breached ?? 0}
              icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
            />
          </Link>

          <Link
            to={PATHS.REQUESTS}
            className="group block transition-opacity hover:opacity-90"
          >
            <StatCard
              label="Awaiting Stock"
              value={requestStats?.metrics.awaiting_stock ?? 0}
              icon={<PackageX className="h-4 w-4 text-warning" />}
            />
          </Link>

          <Card className="p-4 flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                Avg Turnaround
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {requestStats?.metrics.avg_turnaround_hours ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">hours</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-2">
              <Clock className="h-3 w-3" />
              <span>Creation to fulfilment</span>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
