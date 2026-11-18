import { useQuery } from "@tanstack/react-query";
import { Layers, Calendar, CheckCircle2 } from "lucide-react";
import { callApi } from "@/api/callApi";
import { api_methods, endPoints } from "@/api/endpoint";
import type { SoftwareAssignment } from "@/api/software";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/States";

export function PortalSoftware() {
  const query = useQuery({
    queryKey: ["portal-software"],
    queryFn: async () => {
      const result = await callApi<SoftwareAssignment[]>({
        url: endPoints.portal.software,
        method: api_methods.GET,
      });
      if (!result.ok) throw new Error(result.message);
      return result.data ?? [];
    },
  });

  const rows = query.data?.filter((item) => !item.revoked_at) ?? [];

  return (
    <>
      <PageHeader
        title="My Software Subscriptions"
        description="Applications, licenses, and cloud seats provisioned for your work account."
      />

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
              <div className="space-y-2 pt-2">
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
          {rows.map((assignment) => (
            <Card key={assignment.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Layers className="h-4 w-4" />
                    </div>
                    <h2 className="font-semibold text-foreground">
                      {assignment.software?.name ?? "Software application"}
                    </h2>
                  </div>
                  <Badge variant="success" className="text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Active
                  </Badge>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="muted" className="capitalize text-xs">
                    {assignment.software?.category ?? "Productivity"}
                  </Badge>
                  {assignment.software?.license_type && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {assignment.software.license_type.replaceAll("_", " ")}
                    </span>
                  )}
                </div>

                <dl className="mt-4 space-y-2 border-t pt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Assigned on
                    </dt>
                    <dd className="font-medium text-foreground">
                      {new Date(assignment.assigned_at).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8">
          <EmptyState
            title="No software allocated"
            description="You currently have no application licenses or subscriptions assigned to your profile."
          />
        </Card>
      )}
    </>
  );
}
