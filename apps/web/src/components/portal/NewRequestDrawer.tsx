import { useState, useEffect } from "react";
import {
  Laptop,
  RefreshCw,
  Wrench,
  CommandIcon,
  PackageMinus,
  Check,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Drawer } from "@/components/common/Drawer";
import { Stepper, type StepItem } from "@/components/common/Stepper";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import {
  useCreatePortalRequest,
  usePortalRequestOptions,
} from "@/hooks/queries/requests";
import { REQUEST_TYPE, REQUEST_PRIORITY } from "@hm/shared";

const STEPS: StepItem[] = [
  { title: "Request Type", description: "Select what you need" },
  { title: "Item Details", description: "Specify hardware/software" },
  { title: "Reason & Submit", description: "Provide details & submit" },
];

const TYPE_OPTIONS = [
  {
    type: REQUEST_TYPE.NEW_HARDWARE,
    title: "New Hardware",
    description:
      "Request a laptop, monitor, keyboard, or other peripheral equipment.",
    icon: Laptop,
  },
  {
    type: REQUEST_TYPE.CHANGE_REPLACE_HARDWARE,
    title: "Change / Replace",
    description: "Upgrade or replace one of your currently assigned assets.",
    icon: RefreshCw,
  },
  {
    type: REQUEST_TYPE.REPAIR,
    title: "Repair / Fix",
    description: "Report damaged hardware and schedule repair or diagnostics.",
    icon: Wrench,
  },
  {
    type: REQUEST_TYPE.SOFTWARE_ACCESS,
    title: "Software Access",
    description:
      "Request a license key or seat for developer, design, or office software.",
    icon: CommandIcon,
  },
  {
    type: REQUEST_TYPE.RETURN_HARDWARE,
    title: "Return Hardware",
    description:
      "Return an assigned asset you no longer need back to inventory.",
    icon: PackageMinus,
  },
];

export function NewRequestDrawer({
  open,
  onOpenChange,
  initialType,
  initialAssetId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: number;
  initialAssetId?: number;
}) {
  const [step, setStep] = useState(0);

  // Form fields
  const [selectedType, setSelectedType] = useState<number>(
    REQUEST_TYPE.NEW_HARDWARE,
  );
  const [categoryId, setCategoryId] = useState<string>("");
  const [currentAssetId, setCurrentAssetId] = useState<string>("");
  const [softwareId, setSoftwareId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState<number>(REQUEST_PRIORITY.MEDIUM);
  const [neededByDate, setNeededByDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: optionsData } = usePortalRequestOptions();
  const createMutation = useCreatePortalRequest();

  useEffect(() => {
    if (open) {
      setStep(initialAssetId ? 1 : 0);
      setSelectedType(initialType || REQUEST_TYPE.NEW_HARDWARE);
      setCurrentAssetId(initialAssetId ? String(initialAssetId) : "");
      setCategoryId("");
      setSoftwareId("");
      setTitle("");
      setReason("");
      setPriority(REQUEST_PRIORITY.MEDIUM);
      setNeededByDate("");
      setError(null);
    }
  }, [open, initialType, initialAssetId]);

  const categories = optionsData?.categories || [];
  const myAssets = optionsData?.my_assets || [];
  const softwareList = optionsData?.software || [];

  const handleNext = () => {
    setError(null);
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      if (selectedType === REQUEST_TYPE.NEW_HARDWARE && !categoryId) {
        setError("Please choose an asset category.");
        return;
      }
      if (
        (selectedType === REQUEST_TYPE.CHANGE_REPLACE_HARDWARE ||
          selectedType === REQUEST_TYPE.REPAIR ||
          selectedType === REQUEST_TYPE.RETURN_HARDWARE) &&
        !currentAssetId
      ) {
        setError("Please select the assigned asset.");
        return;
      }
      if (selectedType === REQUEST_TYPE.SOFTWARE_ACCESS && !softwareId) {
        setError("Please select the requested software.");
        return;
      }
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a title for your request.");
      return;
    }
    if (!reason.trim()) {
      setError("Please explain the business justification or reason.");
      return;
    }
    setError(null);

    try {
      await createMutation.mutateAsync({
        request_type: selectedType,
        category_id: categoryId ? Number(categoryId) : undefined,
        current_asset_id: currentAssetId ? Number(currentAssetId) : undefined,
        software_id: softwareId ? Number(softwareId) : undefined,
        title: title.trim(),
        reason: reason.trim(),
        priority,
        needed_by_date: neededByDate || undefined,
      });
      onOpenChange(false);
    } catch {
      // error handled by mutation
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Raise Request"
      description="Submit a new hardware or software request for review."
    >
      <div className="space-y-6">
        <Stepper
          steps={STEPS}
          activeStep={step}
          onStepClick={(i) => i < step && setStep(i)}
        />

        {error && (
          <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs font-medium">
            {error}
          </div>
        )}

        {/* Step 1: Type Selection */}
        {step === 0 && (
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-foreground">
              Select Request Category
            </Label>
            <div className="grid grid-cols-1 gap-2.5">
              {TYPE_OPTIONS.map((item) => {
                const Icon = item.icon;
                const isSelected = selectedType === item.type;
                return (
                  <div
                    key={item.type}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedType(item.type)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedType(item.type);
                      }
                    }}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                        : "border-border hover:border-muted-foreground/40 bg-card"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">
                          {item.title}
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleNext} className="gap-1.5">
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Specific Item Selection */}
        {step === 1 && (
          <div className="space-y-4">
            {selectedType === REQUEST_TYPE.NEW_HARDWARE && (
              <div className="space-y-2">
                <Label
                  htmlFor="req-cat"
                  className="text-xs font-semibold text-foreground"
                >
                  Equipment Category
                </Label>
                <NativeSelect
                  id="req-cat"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  <option value="">Choose category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}

            {(selectedType === REQUEST_TYPE.CHANGE_REPLACE_HARDWARE ||
              selectedType === REQUEST_TYPE.REPAIR ||
              selectedType === REQUEST_TYPE.RETURN_HARDWARE) && (
              <div className="space-y-2">
                <Label
                  htmlFor="req-asset"
                  className="text-xs font-semibold text-foreground"
                >
                  Select Your Assigned Asset
                </Label>
                {myAssets.length === 0 ? (
                  <p className="text-xs text-destructive p-3 rounded-lg border border-destructive/20 bg-destructive/10">
                    You currently have no hardware assets assigned to your
                    account.
                  </p>
                ) : (
                  <NativeSelect
                    id="req-asset"
                    value={currentAssetId}
                    onChange={(e) => setCurrentAssetId(e.target.value)}
                    required
                  >
                    <option value="">Select asset...</option>
                    {myAssets.map((ast) => (
                      <option key={ast.id} value={ast.id}>
                        {ast.asset_tag} — {ast.brand} {ast.model} (
                        {ast.category?.name || "Hardware"})
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </div>
            )}

            {selectedType === REQUEST_TYPE.SOFTWARE_ACCESS && (
              <div className="space-y-2">
                <Label
                  htmlFor="req-sw"
                  className="text-xs font-semibold text-foreground"
                >
                  Available Software
                </Label>
                <NativeSelect
                  id="req-sw"
                  value={softwareId}
                  onChange={(e) => setSoftwareId(e.target.value)}
                  required
                >
                  <option value="">Select software title...</option>
                  {softwareList.map((sw) => (
                    <option key={sw.id} value={sw.id}>
                      {sw.name} ({sw.category || "Tool"})
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setStep(0)}
                className="gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} className="gap-1.5">
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Reason, Priority & Submit */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label
                htmlFor="req-title"
                className="text-xs font-semibold text-foreground mb-1 block"
              >
                Request Title
              </Label>
              <Input
                id="req-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Upgrade laptop for mobile builds"
                required
              />
            </div>

            <div>
              <Label
                htmlFor="req-reason"
                className="text-xs font-semibold text-foreground mb-1 block"
              >
                Business Reason & Details
              </Label>
              <Textarea
                id="req-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you need this hardware/software..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  htmlFor="req-priority"
                  className="text-xs font-semibold text-foreground mb-1 block"
                >
                  Urgency / Priority
                </Label>
                <NativeSelect
                  id="req-priority"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                >
                  <option value={REQUEST_PRIORITY.LOW}>Low</option>
                  <option value={REQUEST_PRIORITY.MEDIUM}>Medium</option>
                  <option value={REQUEST_PRIORITY.HIGH}>High</option>
                  <option value={REQUEST_PRIORITY.URGENT}>Urgent</option>
                </NativeSelect>
              </div>

              <div>
                <Label
                  htmlFor="req-date"
                  className="text-xs font-semibold text-foreground mb-1 block"
                >
                  Needed By Date
                </Label>
                <Input
                  id="req-date"
                  type="date"
                  value={neededByDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setNeededByDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="gap-1.5"
              >
                Submit Request
              </Button>
            </div>
          </form>
        )}
      </div>
    </Drawer>
  );
}
