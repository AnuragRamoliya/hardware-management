import { useQuery } from "@tanstack/react-query";
import { Laptop, PackageCheck, ShieldAlert, UsersRound } from "lucide-react";
import { callApi } from "@/api/callApi";
import { endPoints } from "@/api/endpoint";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
    </>
  );
}
