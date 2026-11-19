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
  departmentFormSchema,
  type DepartmentFormValues,
} from "./Department.schema";
import {
  useCreateDepartment,
  useUpdateDepartment,
  type DepartmentRecord,
} from "@/hooks/queries/departments";

interface AddEditDepartmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: DepartmentRecord | null;
  loading?: boolean;
}

const defaultValues: DepartmentFormValues = {
  name: "",
  description: "",
  status: "1",
};

export function AddEditDepartment({
  open,
  onOpenChange,
  department,
  loading,
}: AddEditDepartmentProps) {
  const isEdit = Boolean(department?.id);
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();

  const methods = useForm<DepartmentFormValues>({
    resolver: yupResolver(departmentFormSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = methods;

  useEffect(() => {
    if (department && open) {
      reset({
        name: department.name ?? "",
        description: department.description ?? "",
        status: String(department.status ?? "1"),
      });
    } else if (!open) {
      reset(defaultValues);
    }
  }, [department, open, reset]);

  const onSubmit = async (values: DepartmentFormValues) => {
    const payload: Partial<DepartmentRecord> = {
      name: values.name.trim(),
      description: values.description ? values.description.trim() : null,
      status: Number(values.status),
    };

    if (isEdit && department?.id) {
      await updateMutation.mutateAsync({ ...payload, id: department.id });
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
          isEdit ? `Edit department: ${department?.name}` : "Add new department"
        }
        description={
          isEdit
            ? "Update department name, description, and status."
            : "Create a new organizational department for assigning employees."
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
                title="Department Information"
                description="Basic details for this organizational department."
              >
                <FormGrid>
                  <FormGridItem span={1}>
                    <RHFTextField
                      name="name"
                      label="Department name"
                      placeholder="e.g. Engineering, Sales, Human Resources"
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
                      placeholder="Brief description of the department's role and function"
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
              submitLabel={isEdit ? "Save changes" : "Create department"}
              onCancel={requestClose}
            />
          </FormProvider>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard unsaved changes?"
        description="You have unsaved changes in this department form. If you close now, those changes will be lost."
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
