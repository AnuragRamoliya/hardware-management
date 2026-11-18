import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Drawer } from "@/components/common/Drawer";
import FormProvider from "@/components/hook-form/form-provider";
import {
  FormSection,
  FormGrid,
  FormGridItem,
  FormActions,
} from "@/components/common/FormLayout";
import {
  RHFTextField,
  RHFAsyncSelect,
  RHFCurrencyField,
  RHFDatePicker,
  RHFSegmentedControl,
  RHFTextArea,
} from "@/components/hook-form/fields";
import { KeyValueEditor, type KeyValueEntry } from "@/components/common/KeyValueEditor";
import { Skeleton } from "@/components/ui/skeleton";
import { ASSET_CONDITIONS } from "@/utils/constants";
import { assetFormSchema, type AssetFormValues } from "./Asset.schema";
import { useCreateAsset, useUpdateAsset } from "@/hooks/queries/assets";
import type { AssetRecord } from "@/api/assets";

interface AddEditAssetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: AssetRecord | null;
  loading?: boolean;
}

const defaultValues: AssetFormValues = {
  asset_tag: "",
  serial_no: "",
  brand: "",
  model: "",
  category_id: null,
  vendor_id: null,
  location_id: null,
  parent_asset_id: null,
  condition: "good",
  purchase_date: null,
  purchase_cost: null,
  warranty_start: null,
  warranty_end: null,
  notes: "",
  specs: [],
};

export function AddEditAsset({ open, onOpenChange, asset, loading }: AddEditAssetProps) {
  const isEdit = Boolean(asset?.id);
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();

  const methods = useForm<AssetFormValues>({
    resolver: yupResolver(assetFormSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, isDirty },
  } = methods;

  useEffect(() => {
    if (asset && open) {
      const specsEntries: KeyValueEntry[] = asset.specs
        ? Object.entries(asset.specs).map(([key, value]) => ({ key, value: String(value) }))
        : [];

      reset({
        asset_tag: asset.asset_tag ?? "",
        serial_no: asset.serial_no ?? "",
        brand: asset.brand ?? "",
        model: asset.model ?? "",
        category_id: asset.category_id ?? null,
        vendor_id: asset.vendor_id ?? null,
        location_id: asset.location_id ?? null,
        parent_asset_id: asset.parent_asset_id ?? null,
        condition: (asset.condition as "new" | "good" | "fair" | "poor") ?? "good",
        purchase_date: asset.purchase_date ?? null,
        purchase_cost: asset.purchase_cost != null ? Number(asset.purchase_cost) : null,
        warranty_start: (asset as unknown as Record<string, unknown>).warranty_start as string ?? null,
        warranty_end: asset.warranty_end ?? null,
        notes: asset.notes ?? "",
        specs: specsEntries,
      });
    } else if (!open) {
      reset(defaultValues);
    }
  }, [asset, open, reset]);

  const onSubmit = async (values: AssetFormValues) => {
    const specsRecord: Record<string, string> = {};
    if (Array.isArray(values.specs)) {
      for (const item of values.specs) {
        if (item.key.trim()) {
          specsRecord[item.key.trim()] = item.value;
        }
      }
    }

    const payload: Partial<AssetRecord> = {
      asset_tag: values.asset_tag || undefined,
      serial_no: values.serial_no || null,
      brand: values.brand,
      model: values.model,
      category_id: values.category_id ? Number(values.category_id) : null,
      vendor_id: values.vendor_id ? Number(values.vendor_id) : null,
      location_id: values.location_id ? Number(values.location_id) : null,
      parent_asset_id: values.parent_asset_id ? Number(values.parent_asset_id) : null,
      condition: values.condition as "new" | "good" | "fair" | "poor",
      purchase_date: values.purchase_date || null,
      purchase_cost: values.purchase_cost ?? null,
      warranty_end: values.warranty_end || null,
      notes: values.notes || null,
      specs: Object.keys(specsRecord).length > 0 ? specsRecord : null,
    };

    if (isEdit && asset?.id) {
      await updateMutation.mutateAsync({ ...payload, id: asset.id });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const specsValue = (watch("specs") ?? []) as KeyValueEntry[];

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next && isDirty) {
          if (window.confirm("You have unsaved changes. Discard them?")) {
            onOpenChange(false);
          }
          return;
        }
        onOpenChange(next);
      }}
      title={isEdit ? `Edit asset: ${asset?.asset_tag}` : "Add new hardware asset"}
      description={
        isEdit
          ? "Update equipment specifications, warranty dates, and procurement details."
          : "Register hardware in inventory with serialized tracking and specs."
      }
    >
      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-8">
            <FormSection
              title="Basic Details"
              description="Primary hardware classification, branding, and serial numbering."
            >
              <FormGrid>
                {isEdit && (
                  <RHFTextField
                    name="asset_tag"
                    label="Asset Tag"
                    placeholder="AST-000001"
                    helperText="System identifier (leave as-is unless re-tagging)."
                  />
                )}
                <RHFTextField
                  name="brand"
                  label="Brand / Manufacturer"
                  placeholder="e.g. Dell, Apple, Lenovo"
                  required
                />
                <RHFTextField
                  name="model"
                  label="Model"
                  placeholder="e.g. Latitude 5420, MacBook Pro 14"
                  required
                />
                <RHFTextField
                  name="serial_no"
                  label="Serial Number (S/N)"
                  placeholder="Hardware serial number"
                />
                <RHFAsyncSelect
                  name="category_id"
                  label="Asset Category"
                  endpoint="asset_category/options"
                  clearable
                />
                <RHFAsyncSelect
                  name="location_id"
                  label="Current Location"
                  endpoint="location/options"
                  clearable
                />
                <RHFAsyncSelect
                  name="parent_asset_id"
                  label="Parent Asset (if accessory)"
                  endpoint="asset/options"
                  clearable
                />
              </FormGrid>
            </FormSection>

            <FormSection
              title="Condition & Procurement"
              description="Hardware working condition, supplier vendor, and purchase history."
            >
              <FormGrid>
                <FormGridItem span={3}>
                  <RHFSegmentedControl
                    name="condition"
                    label="Working Condition"
                    options={[...ASSET_CONDITIONS]}
                    required
                  />
                </FormGridItem>
                <RHFAsyncSelect
                  name="vendor_id"
                  label="Supplier Vendor"
                  endpoint="vendor/options"
                  clearable
                />
                <RHFDatePicker
                  name="purchase_date"
                  label="Purchase Date"
                />
                <RHFCurrencyField
                  name="purchase_cost"
                  label="Purchase Cost"
                />
                <RHFDatePicker
                  name="warranty_start"
                  label="Warranty Start"
                />
                <RHFDatePicker
                  name="warranty_end"
                  label="Warranty End"
                />
              </FormGrid>
            </FormSection>

            <FormSection
              title="Hardware Specifications"
              description="Custom properties (RAM, Processor, Storage, Screen Size, OS)."
            >
              <KeyValueEditor
                label="Technical Specs"
                value={specsValue}
                onChange={(next) => setValue("specs", next, { shouldDirty: true })}
                keyPlaceholder="Property (e.g. RAM)"
                valuePlaceholder="Value (e.g. 32GB)"
              />
            </FormSection>

            <FormSection
              title="Notes & Comments"
              description="Internal maintenance instructions, accessories list, or history notes."
            >
              <RHFTextArea
                name="notes"
                label="Notes"
                placeholder="Optional notes or deployment details..."
                rows={3}
              />
            </FormSection>
          </div>

          <FormActions
            submitting={isSubmitting || createMutation.isPending || updateMutation.isPending}
            submitLabel={isEdit ? "Update asset" : "Save asset"}
            onCancel={() => onOpenChange(false)}
          />
        </FormProvider>
      )}
    </Drawer>
  );
}
