import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Drawer } from "@/components/common/Drawer";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
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
  designationFormSchema,
  type DesignationFormValues,
} from "./Designation.schema";
import {
  useCreateDesignation,
  useUpdateDesignation,
  type DesignationRecord,
} from "@/hooks/queries/designations";

interface AddEditDesignationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designation?: DesignationRecord | null;
  loading?: boolean;
}

const defaultValues: DesignationFormValues = {
  name: "",
  description: "",
  status: "1",
};

export function AddEditDesignation({
  open,
  onOpenChange,
  designation,
  loading,
}: AddEditDesignationProps) {
  const isEdit = Boolean(designation?.id);
  const createMutation = useCreateDesignation();
  const updateMutation = useUpdateDesignation();

  const methods = useForm<DesignationFormValues>({
    resolver: yupResolver(designationFormSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = methods;

  useEffect(() => {
    if (designation && open) {
      reset({
        name: designation.name ?? "",
        description: designation.description ?? "",
        status: String(designation.status ?? "1"),
      });
    } else if (!open) {
      reset(defaultValues);
    }
  }, [designation, open, reset]);

  const onSubmit = async (values: DesignationFormValues) => {
    const payload: Partial<DesignationRecord> = {
      name: values.name.trim(),
      description: values.description ? values.description.trim() : null,
      status: Number(values.status),
    };

    if (isEdit && designation?.id) {
      await updateMutation.mutateAsync({ ...payload, id: designation.id });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const requestClose = () => {
    if (isDirty) {
      setConfirmDiscard(true);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}
        title={
          isEdit
            ? `Edit designation: ${designation?.name}`
            : "Add new designation"
        }
        description={
          isEdit
            ? "Update job title, description, and status."
            : "Define a job title and responsibilities across your organization."
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
                title="Designation Information"
                description="Basic details for this role title."
              >
                <FormGrid>
                  <FormGridItem span={1}>
                    <RHFTextField
                      name="name"
                      label="Designation title"
                      placeholder="e.g. Senior Software Engineer, Product Manager"
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
                      placeholder="Brief description of the job duties or level"
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
              submitLabel={isEdit ? "Save changes" : "Create designation"}
              onCancel={requestClose}
            />
          </FormProvider>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard unsaved changes?"
        description="You have unsaved changes in this designation form. If you close now, those changes will be lost."
        confirmText="Discard changes"
        variant="destructive"
        onConfirm={() => {
          setConfirmDiscard(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
