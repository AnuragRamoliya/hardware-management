import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ListPageScaffold } from "@/components/common/ListPageScaffold";
import { TabsList } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTableState } from "@/hooks/use-tableState";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";
import { PATHS } from "@/routes/paths";
import { useRequests, useTakeRequest } from "@/hooks/queries/requests";
import { getRequestColumns } from "@/components/requests/RequestColumns";
import { requestFilters } from "@/components/requests/RequestFilters";
import {
  ReviewRequestDialog,
  FulfilRequestDialog,
  AssignReviewerDialog,
  CommentRequestDialog,
  CloseRequestDialog,
} from "@/components/requests/RequestActionDialogs";
import type { RequestDto } from "@hm/shared";
import type { ListQuery } from "@/types";

const QUEUE_TABS = [
  "All Requests",
  "Unassigned",
  "Mine",
  "Needs Attention (SLA)",
  "Awaiting Stock",
] as const;
type QueueTab = (typeof QUEUE_TABS)[number];

export function Requests() {
  const navigate = useNavigate();
  const { tableState, setTableState } = useTableState(10);
  const [activeTab, setActiveTab] = useState<QueueTab>("All Requests");

  // Dialog states
  const [reviewingRequest, setReviewingRequest] = useState<RequestDto | null>(
    null,
  );
  const [fulfillingRequest, setFulfillingRequest] = useState<RequestDto | null>(
    null,
  );
  const [assigningRequest, setAssigningRequest] = useState<RequestDto | null>(
    null,
  );
  const [commentingRequest, setCommentingRequest] = useState<RequestDto | null>(
    null,
  );
  const [closingRequest, setClosingRequest] = useState<RequestDto | null>(null);
  const [takingRequest, setTakingRequest] = useState<RequestDto | null>(null);

  const role = useAuthStore((state) => getUserRole(state.user));
  const currentUser = useAuthStore((state) => state.user);
  const permissions = usePermissionStore(
    (state) => state.modulePermissions.request,
  );

  const canWrite = role === "admin" || permissions?.write_access === true;
  const canApprove = role === "admin" || permissions?.approve_access === true;

  // Active query combining tableState and active tab
  const activeQuery: ListQuery = useMemo(() => {
    const filters: ListQuery["filters"] = { ...(tableState.filters || {}) };
    delete filters.unassigned;
    delete filters.mine;
    delete filters.sla_breached;
    delete filters.awaiting_stock;

    if (activeTab === "Unassigned") filters.unassigned = true;
    else if (activeTab === "Mine") filters.mine = true;
    else if (activeTab === "Needs Attention (SLA)") filters.sla_breached = true;
    else if (activeTab === "Awaiting Stock") filters.awaiting_stock = true;

    return {
      ...tableState,
      filters,
    };
  }, [tableState, activeTab]);

  const { data, isLoading, error, refetch } = useRequests(activeQuery);
  const takeMutation = useTakeRequest();

  const handleTakeConfirm = async () => {
    if (!takingRequest) return;
    await takeMutation.mutateAsync(takingRequest.id);
    setTakingRequest(null);
  };

  const columns = useMemo(
    () =>
      getRequestColumns({
        onView: (req) =>
          navigate(PATHS.REQUEST_DETAIL.replace(":id", String(req.id))),
        onTake: (req) => setTakingRequest(req),
        onAssign: (req) => setAssigningRequest(req),
        onReview: (req) => setReviewingRequest(req),
        onFulfil: (req) => setFulfillingRequest(req),
        onComment: (req) => setCommentingRequest(req),
        onClose: (req) => setClosingRequest(req),
        currentUserId: currentUser?.id ? Number(currentUser.id) : undefined,
        canWrite,
        canApprove,
      }),
    [navigate, currentUser?.id, canWrite, canApprove],
  );

  const rows = (data?.list as RequestDto[]) || [];
  const count = data?.pagination?.totalItems || 0;

  return (
    <>
      <div className="space-y-4">
        {/* Queue Switcher Tabs */}
        <div className="border-b bg-card px-4 pt-3">
          <TabsList
            activeTab={activeTab}
            onTabChange={(val) => {
              setActiveTab(val as QueueTab);
              setTableState({ currentPage: 1 });
            }}
            tabs={QUEUE_TABS}
          />
        </div>

        <ListPageScaffold
          title="Requests Queue"
          description="Hardware allocations, asset replacements, repairs, and software provisioning review."
          breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Requests" }]}
          columns={columns}
          rows={rows}
          count={count}
          query={tableState}
          onQueryChange={setTableState}
          loading={isLoading}
          error={error instanceof Error ? error.message : undefined}
          onRetry={refetch}
          filterFields={requestFilters}
          emptyTitle="No requests in this queue"
          onRowClick={(row) =>
            navigate(PATHS.REQUEST_DETAIL.replace(":id", String(row.id)))
          }
        />
      </div>

      {/* Action Dialogs */}
      <ReviewRequestDialog
        open={Boolean(reviewingRequest)}
        onOpenChange={(open) => !open && setReviewingRequest(null)}
        request={reviewingRequest}
      />

      <FulfilRequestDialog
        open={Boolean(fulfillingRequest)}
        onOpenChange={(open) => !open && setFulfillingRequest(null)}
        request={fulfillingRequest}
      />

      <AssignReviewerDialog
        open={Boolean(assigningRequest)}
        onOpenChange={(open) => !open && setAssigningRequest(null)}
        request={assigningRequest}
      />

      <CommentRequestDialog
        open={Boolean(commentingRequest)}
        onOpenChange={(open) => !open && setCommentingRequest(null)}
        request={commentingRequest}
      />

      <CloseRequestDialog
        open={Boolean(closingRequest)}
        onOpenChange={(open) => !open && setClosingRequest(null)}
        request={closingRequest}
      />

      <ConfirmDialog
        open={Boolean(takingRequest)}
        onOpenChange={(open) => !open && setTakingRequest(null)}
        title="Take Request"
        description={`Do you want to assign request "${takingRequest?.request_no}" to yourself?`}
        confirmText="Take Request"
        onConfirm={handleTakeConfirm}
      />
    </>
  );
}

export default Requests;
