import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FileCheck2,
  PackageCheck,
  UserCheck,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  PackageX,
  Lock,
  Paperclip,
  Send,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TabsList } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/PageHeader";
import {
  KeyValueList,
  Timeline,
  type TimelineItem,
} from "@/components/common/DataDisplay";
import { EmptyState } from "@/components/common/States";
import { PATHS } from "@/routes/paths";
import useAuthStore from "@/zustand/user-store";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";
import {
  useRequestDetail,
  useTakeRequest,
  useAddRequestComment,
} from "@/hooks/queries/requests";
import {
  ReviewRequestDialog,
  FulfilRequestDialog,
  AssignReviewerDialog,
  CloseRequestDialog,
} from "@/components/requests/RequestActionDialogs";
import {
  REQUEST_TYPE_LABELS,
  REQUEST_STATUS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONES,
  REQUEST_PRIORITY_LABELS,
  REQUEST_PRIORITY_TONES,
} from "@hm/shared";

const tabs = ["Overview", "Conversation", "Fulfilment", "Timeline"] as const;
type Tab = (typeof tabs)[number];

export function RequestDetail() {
  const { id = "" } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  // Comment state
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  // Dialog states
  const [reviewOpen, setReviewOpen] = useState(false);
  const [fulfilOpen, setFulfilOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const currentUser = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => getUserRole(state.user));
  const permissions = usePermissionStore(
    (state) => state.modulePermissions.request,
  );

  const canWrite = role === "admin" || permissions?.write_access === true;
  const canApprove = role === "admin" || permissions?.approve_access === true;

  const { data: request, isLoading, isError, error } = useRequestDetail(id);
  const takeMutation = useTakeRequest();
  const commentMutation = useAddRequestComment();

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !request) return;

    try {
      await commentMutation.mutateAsync({
        request_id: request.id,
        comment: newComment.trim(),
        is_internal: isInternal,
      });
      setNewComment("");
      setIsInternal(false);
    } catch {
      // handled by mutation
    }
  };

  const handleTakeRequest = async () => {
    if (!request) return;
    await takeMutation.mutateAsync(request.id);
  };

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
              : "The requested record does not exist."
          }
          action={
            <Link
              to={PATHS.REQUESTS}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-card px-3 text-[13px] font-medium hover:bg-muted"
            >
              Back to Requests
            </Link>
          }
        />
      </div>
    );
  }

  const isClosed = request.request_status === REQUEST_STATUS.CLOSED;
  const isCancelled = request.request_status === REQUEST_STATUS.CANCELLED;
  const isFulfilled = request.request_status === REQUEST_STATUS.FULFILLED;
  const isApproved = request.request_status === REQUEST_STATUS.APPROVED;
  const isUnderReview = request.request_status === REQUEST_STATUS.UNDER_REVIEW;
  const isSubmitted = request.request_status === REQUEST_STATUS.SUBMITTED;
  const isNeedInfo = request.request_status === REQUEST_STATUS.NEED_INFO;

  const canTake =
    canWrite &&
    request.assigned_to !== currentUser?.id &&
    !isClosed &&
    !isCancelled;

  // Timeline items
  const timelineItems: TimelineItem[] = (request.history || []).map((h) => ({
    id: String(h.id),
    title: `Status: ${REQUEST_STATUS_LABELS[h.to_status] || "Updated"}`,
    description:
      [
        h.changer
          ? `By ${h.changer.first_name} ${h.changer.last_name || ""}`
          : "",
        h.note || "",
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
    time: new Date(h.createdAt || h.created_at || Date.now()).toLocaleString(),
  }));

  const comments = request.comments || [];
  const attachments = request.attachments || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={request.request_no}
        description={`Submitted by ${request.employee?.first_name} ${request.employee?.last_name || ""} on ${new Date(request.createdAt).toLocaleDateString()}`}
        breadcrumbs={[
          { label: "Dashboard", to: "/" },
          { label: "Requests", to: PATHS.REQUESTS },
          { label: request.request_no },
        ]}
      />

      {/* Header Summary Card */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {request.title}
              </h1>
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
              {request.sla_breached ? (
                <Badge variant="danger" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  SLA Breached
                </Badge>
              ) : request.awaiting_stock ? (
                <Badge variant="warning" className="flex items-center gap-1">
                  <PackageX className="h-3 w-3" />
                  Awaiting Stock
                </Badge>
              ) : null}
            </div>

            <p className="text-sm text-muted-foreground whitespace-pre-wrap max-w-3xl">
              {request.reason}
            </p>

            {request.decision_feedback && (
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/40 text-xs">
                <span className="font-semibold text-foreground block mb-0.5">
                  Decision Feedback / Instruction:
                </span>
                <p className="text-muted-foreground">
                  {request.decision_feedback}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canTake && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleTakeRequest}
                className="gap-1.5"
              >
                <UserCheck className="h-4 w-4" />
                Take
              </Button>
            )}

            {canWrite && !isClosed && !isCancelled && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAssignOpen(true)}
                className="gap-1.5"
              >
                <UserPlus className="h-4 w-4" />
                Assign
              </Button>
            )}

            {canApprove && (isSubmitted || isUnderReview || isNeedInfo) && (
              <Button
                size="sm"
                onClick={() => setReviewOpen(true)}
                className="gap-1.5"
              >
                <FileCheck2 className="h-4 w-4" />
                Review
              </Button>
            )}

            {canApprove && (isApproved || isUnderReview) && (
              <Button
                size="sm"
                onClick={() => setFulfilOpen(true)}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <PackageCheck className="h-4 w-4" />
                Fulfil
              </Button>
            )}

            {canWrite && isFulfilled && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCloseOpen(true)}
                className="gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Close
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs Bar */}
      <TabsList
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as Tab)}
        tabs={tabs}
      />

      {/* Tab 1: Overview */}
      {activeTab === "Overview" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Employee Information
            </h2>
            <KeyValueList
              items={[
                {
                  label: "Name",
                  value: (
                    <Link
                      to={PATHS.EMPLOYEE_DETAIL.replace(
                        ":id",
                        String(request.employee_id),
                      )}
                      className="font-medium text-primary hover:underline"
                    >
                      {request.employee?.first_name}{" "}
                      {request.employee?.last_name}
                    </Link>
                  ),
                },
                {
                  label: "Employee Code",
                  value: request.employee?.employee_code || "—",
                },
                { label: "Email", value: request.employee?.email || "—" },
                {
                  label: "Department",
                  value: request.employee?.department?.name || "—",
                },
                {
                  label: "Designation",
                  value: request.employee?.designation?.name || "—",
                },
              ]}
            />
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Request Parameters
            </h2>
            <KeyValueList
              items={[
                {
                  label: "Request Type",
                  value: REQUEST_TYPE_LABELS[request.request_type],
                },
                {
                  label: "Requested Category",
                  value: request.category?.name || "—",
                },
                {
                  label: "Current Asset",
                  value: request.current_asset ? (
                    <Link
                      to={PATHS.ASSET_DETAIL.replace(
                        ":id",
                        String(request.current_asset.id),
                      )}
                      className="text-primary hover:underline font-mono"
                    >
                      {request.current_asset.asset_tag} (
                      {request.current_asset.brand}{" "}
                      {request.current_asset.model})
                    </Link>
                  ) : (
                    "—"
                  ),
                },
                {
                  label: "Software",
                  value: request.software ? (
                    <Link
                      to={PATHS.SOFTWARE_DETAIL.replace(
                        ":id",
                        String(request.software.id),
                      )}
                      className="text-primary hover:underline"
                    >
                      {request.software.name}
                    </Link>
                  ) : (
                    "—"
                  ),
                },
                {
                  label: "Needed By Date",
                  value: request.needed_by_date
                    ? new Date(request.needed_by_date).toLocaleDateString()
                    : "—",
                },
                {
                  label: "Assigned Reviewer",
                  value: request.assignee
                    ? `${request.assignee.first_name} ${request.assignee.last_name || ""}`
                    : "Unassigned",
                },
                {
                  label: "SLA Due Date",
                  value: request.sla_due_at
                    ? new Date(request.sla_due_at).toLocaleString()
                    : "—",
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* Tab 2: Conversation & Attachments */}
      {activeTab === "Conversation" && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              Message & Comment Thread
            </h2>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No messages yet.
                </p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-lg border text-sm ${
                      c.is_internal
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-muted/30 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {c.author?.first_name} {c.author?.last_name || ""}
                        </span>
                        {c.is_internal && (
                          <Badge
                            variant="warning"
                            className="text-[10px] py-0 px-1.5 flex items-center gap-1"
                          >
                            <Lock className="h-2.5 w-2.5" />
                            Staff Internal
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(
                          c.createdAt || c.updatedAt || Date.now(),
                        ).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">
                      {c.comment}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Post comment form */}
            <form
              onSubmit={handlePostComment}
              className="pt-4 border-t space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">
                  Add to conversation
                </span>
                <div className="flex items-center gap-2">
                  <Switch
                    id="internal-toggle"
                    checked={isInternal}
                    onCheckedChange={setIsInternal}
                  />
                  <Label
                    htmlFor="internal-toggle"
                    className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
                  >
                    <Lock className="h-3 w-3" />
                    Internal staff note
                  </Label>
                </div>
              </div>

              <Textarea
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={
                  isInternal
                    ? "Write staff-only internal note..."
                    : "Write message to employee..."
                }
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newComment.trim() || commentMutation.isPending}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isInternal ? "Post Internal Note" : "Send Reply"}
                </Button>
              </div>
            </form>
          </Card>

          {/* Attachments Card */}
          <Card className="p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments ({attachments.length})
            </h2>
            {attachments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No file attachments uploaded for this request.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-lg border bg-card flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-medium text-foreground truncate">
                        {att.file_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {Math.round(att.size / 1024)} KB • {att.mime_type}
                      </p>
                    </div>
                    <a
                      href={att.file_path}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted text-foreground transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Fulfilment */}
      {activeTab === "Fulfilment" && (
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Fulfilment Status
          </h2>
          {!isFulfilled && !isClosed ? (
            <div className="py-6 text-center space-y-3">
              <PackageX className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                This request has not yet been fulfilled.
              </p>
              {canApprove && (isApproved || isUnderReview) && (
                <Button onClick={() => setFulfilOpen(true)} className="gap-1.5">
                  <PackageCheck className="h-4 w-4" />
                  Fulfil Request Now
                </Button>
              )}
            </div>
          ) : (
            <KeyValueList
              items={[
                {
                  label: "Fulfilled Date",
                  value: request.fulfilled_at
                    ? new Date(request.fulfilled_at).toLocaleString()
                    : "—",
                },
                {
                  label: "Fulfilled By",
                  value: request.fulfiller
                    ? `${request.fulfiller.first_name} ${request.fulfiller.last_name || ""}`
                    : "System",
                },
                {
                  label: "Assigned Asset",
                  value: request.assigned_asset ? (
                    <Link
                      to={PATHS.ASSET_DETAIL.replace(
                        ":id",
                        String(request.assigned_asset.id),
                      )}
                      className="font-mono text-primary hover:underline"
                    >
                      {request.assigned_asset.asset_tag} (
                      {request.assigned_asset.brand}{" "}
                      {request.assigned_asset.model})
                    </Link>
                  ) : (
                    "—"
                  ),
                },
                {
                  label: "Assigned License",
                  value: request.assigned_license ? (
                    <span className="font-mono">
                      {request.assigned_license.license_key}
                    </span>
                  ) : (
                    "—"
                  ),
                },
                {
                  label: "Closed Date",
                  value: request.closed_at
                    ? new Date(request.closed_at).toLocaleString()
                    : "Active (Not closed)",
                },
              ]}
            />
          )}
        </Card>
      )}

      {/* Tab 4: Timeline */}
      {activeTab === "Timeline" && (
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Request Status & Action History
          </h2>
          <Timeline items={timelineItems} />
        </Card>
      )}

      {/* Dialogs */}
      <ReviewRequestDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        request={request}
      />

      <FulfilRequestDialog
        open={fulfilOpen}
        onOpenChange={setFulfilOpen}
        request={request}
      />

      <AssignReviewerDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        request={request}
      />

      <CloseRequestDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        request={request}
      />
    </div>
  );
}

export default RequestDetail;
