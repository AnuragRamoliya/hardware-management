import { useState, useMemo } from "react";
import { format, isValid, parseISO } from "date-fns";
import { CalendarClock, List } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { CommonTable, type TableColumn } from "@/components/common/CommonTable";
import { TableFilterPanel } from "@/components/common/TableFilters/TableFilterPanel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/common/States";
import { Timeline } from "@/components/common/DataDisplay";
import { useTableState } from "@/hooks/use-tableState";
import { useAuditLogsList, type AuditRecord } from "@/hooks/queries/auditLogs";
import { auditLogFilters } from "@/components/audit-logs/AuditLogFilters";

const columns: TableColumn<AuditRecord>[] = [
  {
    id: "createdAt",
    label: "Time",
    sortable: true,
    render: (row) => (
      <span className="text-xs text-muted-foreground">
        {formattedDate(row.createdAt)}
      </span>
    ),
  },
  {
    id: "created_by_name",
    label: "User",
    sortable: true,
    render: (row) => (
      <span className="font-medium text-foreground">
        {row.created_by_name ?? "System"}
      </span>
    ),
  },
  {
    id: "action",
    label: "Activity",
    sortable: true,
    render: (row) => (
      <span className="capitalize">
        {row.action?.replaceAll("_", " ") || "—"}
      </span>
    ),
  },
  {
    id: "module",
    label: "Area",
    sortable: true,
    render: (row) =>
      row.module ? (
        <Badge variant="muted">{row.module.replaceAll("_", " ")}</Badge>
      ) : (
        "—"
      ),
  },
  {
    id: "description",
    label: "Details",
    sortable: false,
    render: (row) => (
      <span className="text-sm text-muted-foreground">
        {row.description || "—"}
      </span>
    ),
  },
];

function formattedDate(value?: string) {
  if (!value) return "Time not available";
  const date = parseISO(value);
  return isValid(date) ? format(date, "MMM d, yyyy · h:mm a") : value;
}

export function AuditLogs() {
  const { tableState, setTableState } = useTableState(20);
  const [view, setView] = useState<"timeline" | "table">("timeline");

  const { data, isLoading, error, refetch } = useAuditLogsList(tableState);

  const timelineItems = useMemo(() => {
    return (data?.rows ?? []).map((row) => ({
      id: row.id,
      title: `${row.created_by_name ?? "System"} · ${row.action?.replaceAll("_", " ") ?? "Activity"}`,
      description: row.description ?? row.module ?? "",
      time: formattedDate(row.createdAt),
    }));
  }, [data?.rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit logs"
        description="A clear, chronological record of changes and actions across your workspace."
        breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Audit logs" }]}
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

      {view === "timeline" ? (
        <div className="space-y-4">
          <TableFilterPanel
            config={auditLogFilters}
            value={tableState.filters}
            onApply={(filters) => setTableState({ currentPage: 1, filters })}
            onReset={() => setTableState({ currentPage: 1, filters: {} })}
          />

          <Card className="p-5 sm:p-7">
            {isLoading ? (
              <div className="py-8">
                <Spinner label="Loading audit history" />
              </div>
            ) : error ? (
              <div role="alert" className="py-5 text-sm text-danger">
                {error instanceof Error ? error.message : "Error loading logs"}
                <Button
                  className="ml-3"
                  size="sm"
                  variant="outline"
                  onClick={() => void refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : timelineItems.length > 0 ? (
              <Timeline items={timelineItems} />
            ) : (
              <EmptyState
                title="No audit events found"
                description="Activity logs will appear here once actions are performed in the system."
              />
            )}
          </Card>
        </div>
      ) : (
        <CommonTable<AuditRecord>
          columns={columns}
          filterFields={auditLogFilters}
          rows={data?.rows ?? []}
          count={data?.count ?? 0}
          query={tableState}
          onQueryChange={setTableState}
          loading={isLoading}
          error={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
          emptyTitle="No audit events found"
        />
      )}
    </div>
  );
}
