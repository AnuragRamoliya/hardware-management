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
  RHFTextArea,
  RHFSelect,
} from "@/components/hook-form/fields";
import { Skeleton } from "@/components/ui/skeleton";
import { ENUMS } from "@/utils/constants";
import {
  assetCategoryFormSchema,
  type AssetCategoryFormValues,
} from "./AssetCategory.schema";
import {
  useCreateAssetCategory,
  useUpdateAssetCategory,
  type AssetCategoryRecord,
} from "@/hooks/queries/assetCategories";

interface AddEditAssetCategoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: AssetCategoryRecord | null;
  loading?: boolean;
}

const defaultValues: AssetCategoryFormValues = {
  name: "",
  description: "",
  status: "1",
};

export function AddEditAssetCategory({
  open,
  onOpenChange,
  category,
  loading,
}: AddEditAssetCategoryProps) {
  const isEdit = Boolean(category?.id);
  const createMutation = useCreateAssetCategory();
  const updateMutation = useUpdateAssetCategory();

  const methods = useForm<AssetCategoryFormValues>({
    resolver: yupResolver(assetCategoryFormSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = methods;

  useEffect(() => {
    if (category && open) {
      reset({
        name: category.name ?? "",
        description: category.description ?? "",
        status: String(category.status ?? "1"),
      });
    } else if (!open) {
      reset(defaultValues);
    }
  }, [category, open, reset]);

  const onSubmit = async (values: AssetCategoryFormValues) => {
    const payload: Partial<AssetCategoryRecord> = {
      name: values.name.trim(),
      description: values.description ? values.description.trim() : null,
      status: Number(values.status),
    };

    if (isEdit && category?.id) {
      await updateMutation.mutateAsync({ ...payload, id: category.id });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

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
      title={
        isEdit ? `Edit category: ${category?.name}` : "Add new asset category"
      }
      description={
        isEdit
          ? "Update category naming, description, and status."
          : "Create a classification category for hardware inventory items."
      }
    >
      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <FormSection
              title="Category Information"
              description="Define the hardware category name and scope."
            >
              <FormGrid>
                <FormGridItem span={1}>
                  <RHFTextField
                    name="name"
                    label="Category name"
                    placeholder="e.g. Laptops, Monitors, Keyboards, Servers"
                    required
                  />
                </FormGridItem>
                <FormGridItem span={1}>
                  <RHFSelect
                    name="status"
                    label="Status"
                    options={[...ENUMS.recordStatus]}
                    required
                  />
                </FormGridItem>
                <FormGridItem span={2}>
                  <RHFTextArea
                    name="description"
                    label="Description"
                    placeholder="Brief description of the equipment types in this category"
                  />
                </FormGridItem>
              </FormGrid>
            </FormSection>
          </div>
          <FormActions
            submitting={
              isSubmitting ||
              createMutation.isPending ||
              updateMutation.isPending
            }
            submitLabel={isEdit ? "Save changes" : "Create category"}
            onCancel={() => {
              if (isDirty) {
                if (window.confirm("You have unsaved changes. Discard them?")) {
                  onOpenChange(false);
                }
                return;
              }
              onOpenChange(false);
            }}
          />
        </FormProvider>
      )}
    </Drawer>
  );
}
