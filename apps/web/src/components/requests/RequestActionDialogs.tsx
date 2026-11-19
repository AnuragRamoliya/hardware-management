import { useEffect, useState } from "react";
import { ActionDialogLayout } from "@/components/common/ActionDialogLayout";
import { FormActions } from "@/components/common/FormLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import {
  useReviewRequest,
  useFulfilRequest,
  useAssignRequest,
  useCloseRequest,
  useAddRequestComment,
  useRequestOptions,
} from "@/hooks/queries/requests";
import { useAssetsList } from "@/hooks/queries/assets";
import {
  REQUEST_TYPE,
  REQUEST_TYPE_LABELS,
  REQUEST_STATUS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONES,
  REQUEST_PRIORITY_LABELS,
  type RequestDto,
} from "@hm/shared";

function RequestSummaryCard({ req }: { req?: RequestDto | null }) {
  if (!req) return null;
  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-foreground text-sm">
          {req.request_no}
        </span>
        <Badge variant={REQUEST_STATUS_TONES[req.request_status]}>
          {REQUEST_STATUS_LABELS[req.request_status]}
        </Badge>
      </div>
      <div className="font-medium text-foreground">{req.title}</div>
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Employee:</span>
        <span className="text-foreground">
          {req.employee?.first_name} {req.employee?.last_name || ""} (
          {req.employee?.employee_code})
        </span>
      </div>
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Type:</span>
        <span className="text-foreground">
          {REQUEST_TYPE_LABELS[req.request_type]}
        </span>
      </div>
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Priority:</span>
        <span className="text-foreground">
          {REQUEST_PRIORITY_LABELS[req.priority]}
        </span>
      </div>
    </div>
  );
}

// ==========================================
// 1. Review Request Dialog
// ==========================================
export function ReviewRequestDialog({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RequestDto | null | undefined;
}) {
  const [action, setAction] = useState<
    "start_review" | "approve" | "reject" | "need_info"
  >("approve");
  const [awaitingStock, setAwaitingStock] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reviewMutation = useReviewRequest();

  useEffect(() => {
    if (open) {
      if (request?.request_status === REQUEST_STATUS.SUBMITTED) {
        setAction("start_review");
      } else {
        setAction("approve");
      }
      setAwaitingStock(Boolean(request?.awaiting_stock));
      setFeedback("");
      setError(null);
    }
  }, [open, request]);

  if (!request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (action === "reject" || action === "need_info") &&
      feedback.trim().length < 5
    ) {
      setError("Feedback is required (minimum 5 characters).");
      return;
    }
    setError(null);

    try {
      await reviewMutation.mutateAsync({
        id: request.id,
        action,
        feedback: feedback.trim() || undefined,
        awaiting_stock: action === "approve" ? awaitingStock : undefined,
      });
      onOpenChange(false);
    } catch {
      // handled by mutation onError
    }
  };

  return (
    <ActionDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Review Request"
      description="Record review decision and feedback for this employee request."
      summaryCard={<RequestSummaryCard req={request} />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-xs font-medium text-foreground mb-1.5 block">
            Review Decision
          </Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button
              type="button"
              variant={action === "start_review" ? "primary" : "outline"}
              size="sm"
              onClick={() => setAction("start_review")}
            >
              Start Review
            </Button>
            <Button
              type="button"
              variant={action === "approve" ? "primary" : "outline"}
              size="sm"
              className={
                action === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : ""
              }
              onClick={() => setAction("approve")}
            >
              Approve
            </Button>
            <Button
              type="button"
              variant={action === "need_info" ? "primary" : "outline"}
              size="sm"
              className={
                action === "need_info"
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : ""
              }
              onClick={() => setAction("need_info")}
            >
              Need Info
            </Button>
            <Button
              type="button"
              variant={action === "reject" ? "destructive" : "outline"}
              size="sm"
              onClick={() => setAction("reject")}
            >
              Reject
            </Button>
          </div>
        </div>

        {action === "approve" && (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
            <div className="space-y-0.5">
              <Label htmlFor="awaiting-stock" className="text-sm font-medium">
                Awaiting Stock
              </Label>
              <p className="text-xs text-muted-foreground">
                Approve now but queue for fulfilment when inventory arrives
              </p>
            </div>
            <Switch
              id="awaiting-stock"
              checked={awaitingStock}
              onCheckedChange={setAwaitingStock}
            />
          </div>
        )}

        <div>
          <Label
            htmlFor="review-feedback"
            className="text-xs font-medium text-foreground mb-1 block"
          >
            {action === "reject" || action === "need_info"
              ? "Feedback (Required, min 5 chars)"
              : "Decision Notes (Optional)"}
          </Label>
          <Textarea
            id="review-feedback"
            rows={3}
            value={feedback}
            onChange={(e) => {
              setFeedback(e.target.value);
              if (error) setError(null);
            }}
            placeholder={
              action === "reject"
                ? "State the reason for request rejection..."
                : action === "need_info"
                  ? "Describe what additional information or clarification is needed..."
                  : "Add optional notes or instructions..."
            }
          />
          {error && (
            <p className="text-xs font-medium text-destructive mt-1">{error}</p>
          )}
        </div>

        <FormActions
          onCancel={() => onOpenChange(false)}
          submitLabel={
            action === "reject"
              ? "Confirm Rejection"
              : action === "approve"
                ? "Confirm Approval"
                : "Submit Decision"
          }
          submitting={reviewMutation.isPending}
        />
      </form>
    </ActionDialogLayout>
  );
}

// ==========================================
// 2. Fulfil Request Dialog
// ==========================================
export function FulfilRequestDialog({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RequestDto | null | undefined;
}) {
  const [assetId, setAssetId] = useState<string>("");
  const [newAssetId, setNewAssetId] = useState<string>("");
  const [loanerAssetId, setLoanerAssetId] = useState<string>("");
  const [licenseId, setLicenseId] = useState<string>("");
  const [returnCondition, setReturnCondition] = useState<string>("good");
  const [toStatus, setToStatus] = useState<string>("available");
  const [vendorId, setVendorId] = useState<string>("");
  const [cost, setCost] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const fulfilMutation = useFulfilRequest();

  // Load available assets (asset_status: 1)
  const { data: availableAssets } = useAssetsList({
    currentPage: 1,
    itemsPerPage: 100,
    sortBy: [],
    filters: {
      asset_status: 1,
      ...(request?.category_id ? { category_id: request.category_id } : {}),
    },
  });

  const requestType = request ? request.request_type : 1;

  useEffect(() => {
    if (open) {
      setAssetId("");
      setNewAssetId("");
      setLoanerAssetId("");
      setLicenseId("");
      setReturnCondition("good");
      setToStatus("available");
      setVendorId("");
      setCost("");
      setNotes("");
      setError(null);
    }
  }, [open, request]);

  if (!request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: import("@/api/requests").FulfilRequestPayload = {
      request_id: request.id,
      notes: notes.trim() || undefined,
    };

    if (requestType === REQUEST_TYPE.NEW_HARDWARE) {
      if (!assetId) {
        setError("Please select an available asset to assign.");
        return;
      }
      payload.asset_id = Number(assetId);
    } else if (requestType === REQUEST_TYPE.CHANGE_REPLACE_HARDWARE) {
      if (!newAssetId) {
        setError("Please select a new replacement asset.");
        return;
      }
      payload.new_asset_id = Number(newAssetId);
      payload.return_condition = returnCondition;
      payload.to_status = toStatus;
    } else if (requestType === REQUEST_TYPE.REPAIR) {
      payload.vendor_id = vendorId ? Number(vendorId) : undefined;
      payload.cost = cost ? Number(cost) : undefined;
      payload.loaner_asset_id = loanerAssetId
        ? Number(loanerAssetId)
        : undefined;
    } else if (requestType === REQUEST_TYPE.SOFTWARE_ACCESS) {
      if (licenseId) payload.license_id = Number(licenseId);
    } else if (requestType === REQUEST_TYPE.RETURN_HARDWARE) {
      payload.return_condition = returnCondition;
      payload.to_status = toStatus;
    }

    try {
      await fulfilMutation.mutateAsync(payload);
      onOpenChange(false);
    } catch {
      // handled by mutation onError
    }
  };

  const assetList = availableAssets?.rows || [];

  return (
    <ActionDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Fulfil Request"
      description="Assign inventory, schedule repairs, or provision software seats."
      summaryCard={<RequestSummaryCard req={request} />}
      maxWidth="sm:max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {requestType === REQUEST_TYPE.NEW_HARDWARE && (
          <div>
            <Label
              htmlFor="asset-select"
              className="text-xs font-medium text-foreground mb-1 block"
            >
              Available Asset ({assetList.length} in stock)
            </Label>
            <NativeSelect
              id="asset-select"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              required
            >
              <option value="">Select available asset...</option>
              {assetList.map((ast) => (
                <option key={ast.id} value={ast.id}>
                  {ast.asset_tag} - {ast.brand} {ast.model} (
                  {ast.serial_no || "No SN"})
                </option>
              ))}
            </NativeSelect>
          </div>
        )}

        {requestType === REQUEST_TYPE.CHANGE_REPLACE_HARDWARE && (
          <div className="space-y-3">
            <div>
              <Label
                htmlFor="new-asset-select"
                className="text-xs font-medium text-foreground mb-1 block"
              >
                New Replacement Asset
              </Label>
              <NativeSelect
                id="new-asset-select"
                value={newAssetId}
                onChange={(e) => setNewAssetId(e.target.value)}
                required
              >
                <option value="">Select new replacement asset...</option>
                {assetList.map((ast) => (
                  <option key={ast.id} value={ast.id}>
                    {ast.asset_tag} - {ast.brand} {ast.model}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
              <span className="text-xs font-semibold text-foreground block">
                Current Asset Return: {request.current_asset?.asset_tag} (
                {request.current_asset?.brand} {request.current_asset?.model})
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label
                    htmlFor="return-cond"
                    className="text-xs text-muted-foreground block mb-1"
                  >
                    Return Condition
                  </Label>
                  <NativeSelect
                    id="return-cond"
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value)}
                  >
                    <option value="new">New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </NativeSelect>
                </div>
                <div>
                  <Label
                    htmlFor="to-status"
                    className="text-xs text-muted-foreground block mb-1"
                  >
                    Destination Status
                  </Label>
                  <NativeSelect
                    id="to-status"
                    value={toStatus}
                    onChange={(e) => setToStatus(e.target.value)}
                  >
                    <option value="available">Available in Stock</option>
                    <option value="in_repair">Needs Repair</option>
                    <option value="retired">Retired / Surplus</option>
                  </NativeSelect>
                </div>
              </div>
            </div>
          </div>
        )}

        {requestType === REQUEST_TYPE.REPAIR && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg border bg-muted/20 text-xs">
              Asset to be sent for repair:{" "}
              <strong>{request.current_asset?.asset_tag}</strong> -{" "}
              {request.current_asset?.brand} {request.current_asset?.model}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label
                  htmlFor="repair-cost"
                  className="text-xs text-muted-foreground block mb-1"
                >
                  Estimated Cost ($)
                </Label>
                <Input
                  id="repair-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label
                  htmlFor="loaner-select"
                  className="text-xs text-muted-foreground block mb-1"
                >
                  Optional Loaner Asset
                </Label>
                <NativeSelect
                  id="loaner-select"
                  value={loanerAssetId}
                  onChange={(e) => setLoanerAssetId(e.target.value)}
                >
                  <option value="">None (No loaner)</option>
                  {assetList.map((ast) => (
                    <option key={ast.id} value={ast.id}>
                      {ast.asset_tag} - {ast.brand} {ast.model}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
          </div>
        )}

        {requestType === REQUEST_TYPE.SOFTWARE_ACCESS && (
          <div>
            <div className="p-2.5 rounded-lg border bg-muted/20 text-xs mb-3">
              Software: <strong>{request.software?.name}</strong> (
              {request.software?.category || "Access"})
            </div>
            <p className="text-xs text-muted-foreground">
              A free license seat will be automatically provisioned for this
              employee.
            </p>
          </div>
        )}

        {requestType === REQUEST_TYPE.RETURN_HARDWARE && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg border bg-muted/20 text-xs">
              Returning Asset:{" "}
              <strong>{request.current_asset?.asset_tag}</strong> -{" "}
              {request.current_asset?.brand} {request.current_asset?.model}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label
                  htmlFor="ret-cond"
                  className="text-xs text-muted-foreground block mb-1"
                >
                  Condition
                </Label>
                <NativeSelect
                  id="ret-cond"
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                >
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </NativeSelect>
              </div>
              <div>
                <Label
                  htmlFor="ret-status"
                  className="text-xs text-muted-foreground block mb-1"
                >
                  Return To
                </Label>
                <NativeSelect
                  id="ret-status"
                  value={toStatus}
                  onChange={(e) => setToStatus(e.target.value)}
                >
                  <option value="available">Available in Stock</option>
                  <option value="in_repair">Needs Repair</option>
                  <option value="retired">Retired</option>
                </NativeSelect>
              </div>
            </div>
          </div>
        )}

        <div>
          <Label
            htmlFor="fulfil-notes"
            className="text-xs font-medium text-foreground mb-1 block"
          >
            Fulfilment Notes
          </Label>
          <Textarea
            id="fulfil-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional handover or setup notes..."
          />
        </div>

        {error && (
          <p className="text-xs font-medium text-destructive">{error}</p>
        )}

        <FormActions
          onCancel={() => onOpenChange(false)}
          submitLabel="Fulfil & Dispatch"
          submitting={fulfilMutation.isPending}
        />
      </form>
    </ActionDialogLayout>
  );
}

// ==========================================
// 3. Assign Reviewer Dialog
// ==========================================
export function AssignReviewerDialog({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RequestDto | null | undefined;
}) {
  const [assignedTo, setAssignedTo] = useState<string>("");
  const assignMutation = useAssignRequest();
  const { data: optionsData } = useRequestOptions();

  useEffect(() => {
    if (open && request) {
      setAssignedTo(request.assigned_to ? String(request.assigned_to) : "");
    }
  }, [open, request]);

  if (!request) return null;

  const reviewers = optionsData?.reviewers || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTo) return;

    try {
      await assignMutation.mutateAsync({
        id: request.id,
        assigned_to: Number(assignedTo),
      });
      onOpenChange(false);
    } catch {
      // error handled
    }
  };

  return (
    <ActionDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Assign Reviewer"
      description="Delegate this request to a reviewer or team member."
      summaryCard={<RequestSummaryCard req={request} />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label
            htmlFor="assignee-select"
            className="text-xs font-medium text-foreground mb-1 block"
          >
            Reviewer / Owner
          </Label>
          <NativeSelect
            id="assignee-select"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            required
          >
            <option value="">Select team member...</option>
            {reviewers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name} ({user.email})
              </option>
            ))}
          </NativeSelect>
        </div>

        <FormActions
          onCancel={() => onOpenChange(false)}
          submitLabel="Assign Request"
          submitting={assignMutation.isPending}
        />
      </form>
    </ActionDialogLayout>
  );
}

// ==========================================
// 4. Comment Dialog
// ==========================================
export function CommentRequestDialog({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RequestDto | null | undefined;
}) {
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const commentMutation = useAddRequestComment();

  useEffect(() => {
    if (open) {
      setComment("");
      setIsInternal(false);
    }
  }, [open]);

  if (!request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      await commentMutation.mutateAsync({
        request_id: request.id,
        comment: comment.trim(),
        is_internal: isInternal,
      });
      onOpenChange(false);
    } catch {
      // error handled
    }
  };

  return (
    <ActionDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Add Comment"
      description="Leave a note or send a message to the employee."
      summaryCard={<RequestSummaryCard req={request} />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
          <div className="space-y-0.5">
            <Label
              htmlFor="is-internal-comment"
              className="text-sm font-medium"
            >
              Internal Note Only
            </Label>
            <p className="text-xs text-muted-foreground">
              Hidden from employee; visible only to staff & reviewers
            </p>
          </div>
          <Switch
            id="is-internal-comment"
            checked={isInternal}
            onCheckedChange={setIsInternal}
          />
        </div>

        <div>
          <Label
            htmlFor="comment-text"
            className="text-xs font-medium text-foreground mb-1 block"
          >
            Comment
          </Label>
          <Textarea
            id="comment-text"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              isInternal
                ? "Write staff-only note..."
                : "Write message to employee..."
            }
            required
          />
        </div>

        <FormActions
          onCancel={() => onOpenChange(false)}
          submitLabel={isInternal ? "Save Internal Note" : "Send Comment"}
          submitting={commentMutation.isPending}
        />
      </form>
    </ActionDialogLayout>
  );
}

// ==========================================
// 5. Close Request Dialog
// ==========================================
export function CloseRequestDialog({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RequestDto | null | undefined;
}) {
  const [notes, setNotes] = useState("");
  const closeMutation = useCloseRequest();

  useEffect(() => {
    if (open) setNotes("");
  }, [open]);

  if (!request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await closeMutation.mutateAsync({
        id: request.id,
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
    } catch {
      // error handled
    }
  };

  return (
    <ActionDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Close Request"
      description="Mark this fulfilled request as completely resolved and closed."
      summaryCard={<RequestSummaryCard req={request} />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label
            htmlFor="close-notes"
            className="text-xs font-medium text-foreground mb-1 block"
          >
            Closing Notes (Optional)
          </Label>
          <Textarea
            id="close-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add final resolution notes..."
          />
        </div>

        <FormActions
          onCancel={() => onOpenChange(false)}
          submitLabel="Close Request"
          submitting={closeMutation.isPending}
        />
      </form>
    </ActionDialogLayout>
  );
}
