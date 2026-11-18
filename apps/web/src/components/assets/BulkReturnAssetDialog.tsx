import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import FormProvider from "@/components/hook-form/form-provider";
import { FormActions } from "@/components/common/FormLayout";
import { RHFSelect, RHFTextArea } from "@/components/hook-form/fields";
import {
  bulkReturnAssetSchema,
  type BulkReturnAssetValues,
} from "./AssetAction.schema";
import { useBulkReturnAssets } from "@/hooks/queries/assets";
import { ASSET_CONDITIONS } from "@/utils/constants";
import type { AssetRecord } from "@/api/assets";

interface BulkReturnAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: AssetRecord[];
  onComplete?: () => void;
}

const destinationStatusOptions = [
  { value: "1", label: "Available (Ready for redeployment)" },
  { value: "4", label: "In repair (Requires maintenance)" },
  { value: "5", label: "Retired (Decommission from inventory)" },
  { value: "6", label: "Lost / Damaged beyond repair" },
];

export function BulkReturnAssetDialog({
  open,
  onOpenChange,
  assets,
  onComplete,
}: BulkReturnAssetDialogProps) {
  const bulkReturnMutation = useBulkReturnAssets();

  const methods = useForm<BulkReturnAssetValues>({
    resolver: yupResolver(bulkReturnAssetSchema),
    defaultValues: {
      return_condition: "good",
      to_status: "1",
      notes: "",
    },
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (open) {
      reset({ return_condition: "good", to_status: "1", notes: "" });
    }
  }, [open, reset]);

  if (!assets.length) return null;

  const onSubmit = async (values: BulkReturnAssetValues) => {
    const items = assets.map((a) => ({
      asset_id: Number(a.id),
      return_condition: values.return_condition,
      to_status: values.to_status,
      notes: values.notes || undefined,
    }));

    await bulkReturnMutation.mutateAsync({ items });
    onOpenChange(false);
    onComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Bulk return assets ({assets.length})</DialogTitle>
        <p className="text-xs text-muted-foreground -mt-2">
          Process check-in and inventory updates for all {assets.length}{" "}
          selected assets.
        </p>

        <Card className="p-3 bg-muted/40 border-dashed text-xs max-h-36 overflow-y-auto space-y-1">
          <p className="font-semibold text-muted-foreground">
            Selected Assets:
          </p>
          {assets.map((a) => (
            <div key={a.id} className="flex justify-between">
              <span className="font-medium">{a.asset_tag}</span>
              <span className="text-muted-foreground">
                {[a.brand, a.model].filter(Boolean).join(" ")}
              </span>
            </div>
          ))}
        </Card>

        <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 mt-2">
            <RHFSelect
              name="return_condition"
              label="Return condition (for all items)"
              options={[...ASSET_CONDITIONS]}
              required
            />
            <RHFSelect
              name="to_status"
              label="Inventory status after return"
              options={destinationStatusOptions}
              required
            />
            <RHFTextArea
              name="notes"
              label="Return inspection notes"
              placeholder="e.g. Returned following employee offboarding, all items verified..."
              rows={2}
            />
          </div>

          <FormActions
            submitting={isSubmitting || bulkReturnMutation.isPending}
            submitLabel={`Return ${assets.length} items`}
            onCancel={() => onOpenChange(false)}
          />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
