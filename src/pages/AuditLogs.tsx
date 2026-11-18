import { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, List, UserRound } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { CommonTable, type TableColumn } from "@/components/common/CommonTable";
import { TableFilterPanel } from "@/components/common/TableFilters/TableFilterPanel";
import { auditConfig } from "@/pages/resources";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/common/States";
import { useTableState } from "@/hooks/use-tableState";
import { listResource } from "@/api/services";
import { endPoints } from "@/api/endpoint";
import type { ListQuery } from "@/types";

interface AuditRow {
  id: string | number;
  action?: string;
  module?: string;
  created_by_name?: string;
  createdAt?: string;
  description?: string;
  name?: string;
}

const columns: TableColumn<AuditRow>[] = [
  { id: "createdAt", label: "Time" },
  {
    id: "created_by_name",
    label: "User",
    render: (row) => row.created_by_name ?? "System",
  },
  { id: "action", label: "Activity" },
  {
    id: "module",
    label: "Area",
    render: (row) =>
      row.module ? <Badge variant="muted">{row.module}</Badge> : "—",
  },
  { id: "description", label: "Details" },
];

function formattedDate(value?: string) {
  if (!value) return "Time not available";
  const date = parseISO(value);
  return isValid(date) ? format(date, "MMM d, yyyy · h:mm a") : value;
}

export function AuditLogs() {
  const { tableState, setTableState } = useTableState(20);
  const [view, setView] = useState<"timeline" | "table">("timeline");
  const query: ListQuery = tableState;
  const result = useQuery({
    queryKey: ["audit-logs", query],
    queryFn: async () => {
      const response = await listResource<AuditRow>(
        endPoints.audit.list,
        query,
      );
      if (!response.ok) throw new Error(response.message);
      return response.data ?? { rows: [], count: 0 };
    },
  });
  return (
    <>
      <PageHeader
        title="Audit logs"
        description="A clear, chronological record of changes and actions across your workspace."
        breadcrumbs={[{ label: "Audit logs" }]}
        action={
          <div className="flex rounded-lg border p-1">
            <Button
              variant={view === "timeline" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("timeline")}
            >
              <CalendarClock className="h-4 w-4" />
              Timeline
            </Button>
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("table")}
            >
              <List className="h-4 w-4" />
              Table
            </Button>
          </div>
        }
      />
      {view === "timeline" && (
        <div className="mb-4">
          <TableFilterPanel
            config={auditConfig.filters ?? []}
            value={query.filters}
            onApply={(filters) => setTableState({ currentPage: 1, filters })}
            onReset={() => setTableState({ currentPage: 1, filters: {} })}
          />
        </div>
      )}
      {query.general_search && view === "timeline" && (
        <>
          <button
            className="mb-3 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground"
            onClick={() => setTableState({ general_search: "" })}
          >
            Search: {query.general_search} ×
          </button>
        </>
      )}
      {view === "table" ? (
        <CommonTable<AuditRow>
          columns={columns}
          filterFields={auditConfig.filters}
          rows={result.data?.rows ?? []}
          count={result.data?.count ?? 0}
          query={query}
          onQueryChange={setTableState}
          loading={result.isLoading}
          error={result.error?.message}
          onRetry={() => void result.refetch()}
          emptyTitle="No audit events found"
        />
      ) : (
        <Card className="p-5 sm:p-7">
          {result.isLoading ? (
            <div className="py-8">
              <Spinner label="Loading audit history" />
            </div>
          ) : result.isError ? (
            <div role="alert" className="py-5 text-sm text-danger">
              {result.error.message}
              <Button
                className="ml-3"
                size="sm"
                variant="outline"
                onClick={() => void result.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : result.data?.rows.length ? (
            <ol className="space-y-0">
              {result.data.rows.map((item, index) => (
                <li
                  key={item.id}
                  className="relative flex gap-4 pb-7 last:pb-0"
                >
                  <span className="relative mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                    <UserRound className="h-4 w-4" />
                    {index < (result.data?.rows.length ?? 0) - 1 && (
                      <span className="absolute left-1/2 top-8 h-full w-px -translate-x-1/2 bg-border" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm">
                        <span className="font-medium">
                          {item.created_by_name ?? "System"}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          {item.action ?? "updated"}{" "}
                        </span>
                        <span className="font-medium">
                          {item.module ?? "workspace"}
                        </span>
                      </p>
                      <time className="shrink-0 text-xs text-muted-foreground">
                        {formattedDate(item.createdAt)}
                      </time>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="No audit activity yet"
              description="Changes made in your workspace will appear here."
            />
          )}
        </Card>
      )}
    </>
  );
}
