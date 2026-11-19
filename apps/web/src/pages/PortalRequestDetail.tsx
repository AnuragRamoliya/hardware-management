import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AlertCircle, HelpCircle, Send, Pencil, XCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Drawer } from "@/components/common/Drawer";
import { Timeline, type TimelineItem } from "@/components/common/DataDisplay";
import { EmptyState } from "@/components/common/States";
import { PATHS } from "@/routes/paths";
import {
  usePortalRequestDetail,
  useAddPortalComment,
  useCancelPortalRequest,
  useUpdatePortalRequest,
} from "@/hooks/queries/requests";
import {
  REQUEST_TYPE_LABELS,
  REQUEST_STATUS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONES,
  REQUEST_PRIORITY_LABELS,
  REQUEST_PRIORITY_TONES,
} from "@hm/shared";

export function PortalRequestDetail() {
  const { id = "" } = useParams();
  const [replyText, setReplyText] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editReason, setEditReason] = useState("");

  const {
    data: request,
    isLoading,
    isError,
    error,
  } = usePortalRequestDetail(id);
  const commentMutation = useAddPortalComment();
  const cancelMutation = useCancelPortalRequest();
  const updateMutation = useUpdatePortalRequest();

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (isError || !request) {
    return (
      <div className="p-6">
        <EmptyState
          title="Request not found"
          description={
            error instanceof Error
              ? error.message
              : "The requested record does not exist or you do not have permission to view it."
          }
          action={
            <Link
              to={PATHS.PORTAL_REQUESTS}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-card px-3 text-[13px] font-medium hover:bg-muted"
            >
              Back to My Requests
            </Link>
          }
        />
      </div>
    );
  }

  const isNeedInfo = request.request_status === REQUEST_STATUS.NEED_INFO;
  const isRejected = request.request_status === REQUEST_STATUS.REJECTED;
  const isSubmitted = request.request_status === REQUEST_STATUS.SUBMITTED;
  const isFulfilled = request.request_status === REQUEST_STATUS.FULFILLED;
  const isClosed = request.request_status === REQUEST_STATUS.CLOSED;
  const isCancelled = request.request_status === REQUEST_STATUS.CANCELLED;

  const canEdit = isSubmitted || isNeedInfo;
  const canCancel = !isFulfilled && !isClosed && !isCancelled;

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      await commentMutation.mutateAsync({
        request_id: request.id,
        comment: replyText.trim(),
      });
      setReplyText("");
    } catch {
      // handled
    }
  };

  const handleCancelConfirm = async () => {
    try {
      await cancelMutation.mutateAsync({
        id: request.id,
      });
      setCancelOpen(false);
    } catch {
      // handled
    }
  };

  const handleOpenEdit = () => {
    setEditTitle(request.title);
    setEditReason(request.reason);
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        id: request.id,
        title: editTitle.trim(),
        reason: editReason.trim(),
      });
      setEditOpen(false);
    } catch {
      // handled
    }
  };

  const timelineItems: TimelineItem[] = (request.history || []).map((h) => ({
    id: String(h.id),
    title: REQUEST_STATUS_LABELS[h.to_status] || "Status updated",
    description: h.note || undefined,
    time: new Date(h.createdAt || h.created_at || Date.now()).toLocaleString(),
  }));

  const comments = request.comments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={request.request_no}
        description={`Submitted on ${new Date(request.createdAt).toLocaleDateString()}`}
        breadcrumbs={[
          { label: "Portal", to: PATHS.PORTAL },
          { label: "My Requests", to: PATHS.PORTAL_REQUESTS },
          { label: request.request_no },
        ]}
        action={
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenEdit}
                className="gap-1.5"
              >
                <Pencil className="h-4 w-4" />
                Edit Details
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelOpen(true)}
                className="gap-1.5 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="h-4 w-4" />
                Cancel Request
              </Button>
            )}
          </div>
        }
      />

      {/* Reviewer Feedback Callout */}
      {isRejected && request.decision_feedback && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-destructive">
              Request Rejected by Reviewer
            </h2>
            <p className="text-sm text-foreground">
              {request.decision_feedback}
            </p>
          </div>
        </div>
      )}

      {isNeedInfo && request.decision_feedback && (
        <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-purple-700 dark:text-purple-400">
              Additional Information Requested
            </h2>
            <p className="text-sm text-foreground">
              {request.decision_feedback}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Please post a reply or update your request below to resume review.
            </p>
          </div>
        </div>
      )}

      {/* Overview Card */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">{request.title}</h1>
          <Badge variant="outline">
            {REQUEST_TYPE_LABELS[request.request_type]}
          </Badge>
          <Badge
            variant={REQUEST_STATUS_TONES[request.request_status]}
            className="font-semibold"
          >
            {REQUEST_STATUS_LABELS[request.request_status]}
          </Badge>
          <Badge variant={REQUEST_PRIORITY_TONES[request.priority]}>
            {REQUEST_PRIORITY_LABELS[request.priority]}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {request.reason}
        </p>

        <div className="pt-4 border-t grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block mb-0.5">
              Needed By Date:
            </span>
            <span className="font-medium text-foreground">
              {request.needed_by_date
                ? new Date(request.needed_by_date).toLocaleDateString()
                : "Flexible"}
            </span>
          </div>
          {request.current_asset && (
            <div>
              <span className="text-muted-foreground block mb-0.5">
                Assigned Asset:
              </span>
              <span className="font-mono text-foreground">
                {request.current_asset.asset_tag} ({request.current_asset.brand}{" "}
                {request.current_asset.model})
              </span>
            </div>
          )}
          {request.software && (
            <div>
              <span className="text-muted-foreground block mb-0.5">
                Requested Software:
              </span>
              <span className="font-medium text-foreground">
                {request.software.name}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Conversation Thread */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          Messages & Updates
        </h2>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 text-center">
              No messages yet.
            </p>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-lg border bg-muted/20 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {c.author?.first_name} {c.author?.last_name || ""}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(
                      c.createdAt || c.updatedAt || Date.now(),
                    ).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {c.comment}
                </p>
              </div>
            ))
          )}
        </div>

        {!isClosed && !isCancelled && (
          <form onSubmit={handleSendReply} className="pt-3 border-t flex gap-2">
            <Input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type a message or answer questions..."
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!replyText.trim() || commentMutation.isPending}
              className="gap-1.5"
            >
              <Send className="h-4 w-4" />
              Reply
            </Button>
          </form>
        )}
      </Card>

      {/* Status History Timeline */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Tracking History
        </h2>
        <Timeline items={timelineItems} />
      </Card>

      {/* Edit Drawer */}
      <Drawer
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit Request"
        description="Update request title and justification."
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <Label
              htmlFor="edit-title"
              className="text-xs font-semibold text-foreground mb-1 block"
            >
              Title
            </Label>
            <Input
              id="edit-title"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label
              htmlFor="edit-reason"
              className="text-xs font-semibold text-foreground mb-1 block"
            >
              Reason
            </Label>
            <Textarea
              id="edit-reason"
              rows={4}
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Request"
        description="Are you sure you want to cancel this request? This action cannot be undone."
        confirmText="Cancel Request"
        variant="destructive"
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
}

export default PortalRequestDetail;
