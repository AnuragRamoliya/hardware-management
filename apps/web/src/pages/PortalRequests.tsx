import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Eye } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CommonTable, type TableColumn } from "@/components/common/CommonTable";
import { useTableState } from "@/hooks/use-tableState";
import { usePortalRequests } from "@/hooks/queries/requests";
import { NewRequestDrawer } from "@/components/portal/NewRequestDrawer";
import { PATHS } from "@/routes/paths";
import {
  REQUEST_TYPE_LABELS,
  REQUEST_STATUS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONES,
  REQUEST_PRIORITY_LABELS,
  REQUEST_PRIORITY_TONES,
  type PortalRequestDto,
} from "@hm/shared";
import type { ListQuery } from "@/types";

export function PortalRequests() {
  const navigate = useNavigate();
  const { tableState, setTableState } = useTableState(10);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const activeQuery: ListQuery = useMemo(() => {
    const filters: ListQuery["filters"] = { ...(tableState.filters || {}) };
    if (statusFilter !== "all") {
      filters.request_status = Number(statusFilter);
    } else {
      delete filters.request_status;
    }
    return {
      ...tableState,
      filters,
    };
  }, [tableState, statusFilter]);

  const { data, isLoading } = usePortalRequests(activeQuery);

  const columns: TableColumn<PortalRequestDto>[] = [
    {
      id: "request_no",
      label: "Request #",
      sortable: true,
      render: (row) => (
        <Link
          to={PATHS.PORTAL_REQUEST_DETAIL.replace(":id", String(row.id))}
          className="font-semibold text-primary hover:underline whitespace-nowrap"
        >
          {row.request_no}
        </Link>
      ),
    },
    {
      id: "request_type",
      label: "Type",
      render: (row) => (
        <Badge variant="outline" className="font-medium whitespace-nowrap">
          {REQUEST_TYPE_LABELS[row.request_type] || "Request"}
        </Badge>
      ),
    },
    {
      id: "title",
      label: "Title",
      render: (row) => (
        <div className="flex flex-col min-w-0 max-w-xs">
          <span className="font-medium text-foreground truncate">
            {row.title}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {row.reason}
          </span>
        </div>
      ),
    },
    {
      id: "priority",
      label: "Priority",
      render: (row) => (
        <Badge
          variant={REQUEST_PRIORITY_TONES[row.priority]}
          className="whitespace-nowrap"
        >
          {REQUEST_PRIORITY_LABELS[row.priority]}
        </Badge>
      ),
    },
    {
      id: "request_status",
      label: "Status",
      render: (row) => (
        <Badge
          variant={REQUEST_STATUS_TONES[row.request_status]}
          className="whitespace-nowrap font-medium"
        >
          {REQUEST_STATUS_LABELS[row.request_status]}
        </Badge>
      ),
    },
    {
      id: "needed_by",
      label: "Needed By",
      render: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {row.needed_by_date
            ? new Date(row.needed_by_date).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
    {
      id: "createdAt",
      label: "Submitted",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      label: "",
      render: (row) => (
        <Link
          to={PATHS.PORTAL_REQUEST_DETAIL.replace(":id", String(row.id))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted text-foreground transition-colors"
        >
          <Eye className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  const rows = (data?.list as PortalRequestDto[]) || [];
  const count = data?.pagination?.totalItems || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Requests"
        description="Raise and track hardware, maintenance, and software requests."
        breadcrumbs={[
          { label: "Portal", to: PATHS.PORTAL },
          { label: "My Requests" },
        ]}
        action={
          <Button onClick={() => setNewRequestOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Raise Request
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: "All Requests", value: "all" },
          { label: "Submitted", value: String(REQUEST_STATUS.SUBMITTED) },
          { label: "In Review", value: String(REQUEST_STATUS.UNDER_REVIEW) },
          { label: "Need Info", value: String(REQUEST_STATUS.NEED_INFO) },
          { label: "Approved", value: String(REQUEST_STATUS.APPROVED) },
          { label: "Fulfilled", value: String(REQUEST_STATUS.FULFILLED) },
          { label: "Closed", value: String(REQUEST_STATUS.CLOSED) },
        ].map((item) => (
          <Button
            key={item.value}
            type="button"
            variant={statusFilter === item.value ? "primary" : "secondary"}
            size="sm"
            onClick={() => {
              setStatusFilter(item.value);
              setTableState({ currentPage: 1 });
            }}
            className="h-8 rounded-full px-3 text-xs"
          >
            {item.label}
          </Button>
        ))}
      </div>

      {/* Requests Table */}
      <Card className="overflow-hidden">
        <CommonTable
          columns={columns}
          rows={rows}
          count={count}
          query={tableState}
          onQueryChange={setTableState}
          loading={isLoading}
          emptyTitle="No requests found"
          onRowClick={(row) =>
            navigate(PATHS.PORTAL_REQUEST_DETAIL.replace(":id", String(row.id)))
          }
        />
      </Card>

      <NewRequestDrawer
        open={newRequestOpen}
        onOpenChange={setNewRequestOpen}
      />
    </div>
  );
}

export default PortalRequests;
