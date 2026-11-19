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
import { locationFormSchema, type LocationFormValues } from "./Location.schema";
import {
  useCreateLocation,
  useUpdateLocation,
  type LocationRecord,
} from "@/hooks/queries/locations";

interface AddEditLocationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: LocationRecord | null;
  loading?: boolean;
}

const defaultValues: LocationFormValues = {
  name: "",
  address: "",
  status: "1",
};

export function AddEditLocation({
  open,
  onOpenChange,
  location,
  loading,
}: AddEditLocationProps) {
  const isEdit = Boolean(location?.id);
  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation();

  const methods = useForm<LocationFormValues>({
    resolver: yupResolver(locationFormSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = methods;

  useEffect(() => {
    if (location && open) {
      reset({
        name: location.name ?? "",
        address: location.address ?? "",
        status: String(location.status ?? "1"),
      });
    } else if (!open) {
      reset(defaultValues);
    }
  }, [location, open, reset]);

  const onSubmit = async (values: LocationFormValues) => {
    const payload: Partial<LocationRecord> = {
      name: values.name.trim(),
      address: values.address ? values.address.trim() : null,
      status: Number(values.status),
    };

    if (isEdit && location?.id) {
      await updateMutation.mutateAsync({ ...payload, id: location.id });
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
        title={isEdit ? `Edit location: ${location?.name}` : "Add new location"}
        description={
          isEdit
            ? "Update site location name, address, and status."
            : "Register an office site or branch location for tracking physical assets."
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
                title="Location Details"
                description="Office site name and physical street address."
              >
                <FormGrid>
                  <FormGridItem span={1}>
                    <RHFTextField
                      name="name"
                      label="Location name"
                      placeholder="e.g. Headquarters - Floor 3, Mumbai Tech Hub"
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
                      name="address"
                      label="Full address"
                      placeholder="Physical street address, city, and postal code"
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
              submitLabel={isEdit ? "Save changes" : "Create location"}
              onCancel={requestClose}
            />
          </FormProvider>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard unsaved changes?"
        description="You have unsaved changes in this location form. If you close now, those changes will be lost."
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
