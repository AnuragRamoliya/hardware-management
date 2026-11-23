import { useQuery } from "@tanstack/react-query";
import { Laptop, Calendar, ShieldCheck, Tag } from "lucide-react";
import { callApi } from "@/api/callApi";
import { api_methods, endPoints } from "@/api/endpoint";
import type { AssignmentRecord } from "@/api/assets";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/States";
import { AssetStatusBadge } from "@/components/assets/AssetStatusBadge";
import { PATHS } from "@/routes/paths";

export function PortalAssets() {
  const query = useQuery({
    queryKey: ["portal-assets"],
    queryFn: async () => {
      const result = await callApi<AssignmentRecord[]>({
        url: endPoints.portal.assets,
        method: api_methods.GET,
      });
      if (!result.ok) throw new Error(result.message);
      return result.data ?? [];
    },
  });

  const rows = query.data?.filter((item) => !item.returned_at) ?? [];

  return (
    <>
      <PageHeader
        title="My Assigned Hardware"
        description="Physical equipment, laptops, and peripherals currently checked out to you."
        breadcrumbs={[
          { label: "Portal", to: PATHS.PORTAL },
          { label: "My Assets" },
        ]}
      />

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : query.error ? (
        <Card role="alert" className="p-6 text-sm text-danger text-center">
          {query.error.message}
        </Card>
      ) : rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((assignment) => {
            const isDueSoon =
              assignment.due_return_date &&
              new Date(assignment.due_return_date).getTime() - Date.now() <
                7 * 24 * 60 * 60 * 1000;

            return (
              <Card
                key={assignment.id}
                className="p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Laptop className="h-4 w-4" />
                      </div>
                      <h2 className="font-semibold text-foreground">
                        {assignment.asset?.asset_tag ??
                          `Asset #${assignment.asset_id}`}
                      </h2>
                    </div>
                    <AssetStatusBadge
                      status={assignment.asset?.asset_status ?? 2}
                    />
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">
                    {[assignment.asset?.brand, assignment.asset?.model]
                      .filter(Boolean)
                      .join(" ") || "Hardware equipment"}
                  </p>

                  <dl className="mt-4 space-y-2 border-t pt-3 text-xs">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" />
                        Serial number
                      </dt>
                      <dd className="font-mono text-foreground">
                        {assignment.asset?.serial_no ?? "—"}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Due return date
                      </dt>
                      <dd>
                        {assignment.due_return_date ? (
                          <Badge
                            variant={isDueSoon ? "warning" : "muted"}
                            className="text-[11px]"
                          >
                            {new Date(
                              assignment.due_return_date,
                            ).toLocaleDateString()}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            Permanent setup
                          </span>
                        )}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Warranty
                      </dt>
                      <dd className="text-muted-foreground">
                        {assignment.asset?.warranty_end
                          ? new Date(
                              assignment.asset.warranty_end,
                            ).toLocaleDateString()
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                </div>

                {assignment.note && (
                  <p className="mt-4 border-t pt-2 text-xs italic text-muted-foreground">
                    "{assignment.note}"
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8">
          <EmptyState
            title="No assigned equipment"
            description="You currently have no hardware assets checked out to your account."
          />
        </Card>
      )}
    </>
  );
}
