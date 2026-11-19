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
  RHFPasswordField,
  RHFAsyncSelect,
  RHFSelect,
} from "@/components/hook-form/fields";
import { Skeleton } from "@/components/ui/skeleton";
import { ENUMS } from "@/utils/constants";
import { userFormSchema, type UserFormValues } from "./User.schema";
import {
  useCreateUser,
  useUpdateUser,
  type UserRecord,
} from "@/hooks/queries/users";
import { toast } from "sonner";

interface AddEditUserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserRecord | null;
  loading?: boolean;
}

const defaultValues: UserFormValues = {
  first_name: "",
  last_name: "",
  email: "",
  role_id: "",
  password: "",
  status: "1",
};

export function AddEditUser({
  open,
  onOpenChange,
  user,
  loading,
}: AddEditUserProps) {
  const isEdit = Boolean(user?.id);
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const methods = useForm<UserFormValues>({
    resolver: yupResolver(userFormSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = methods;

  useEffect(() => {
    if (user && open) {
      reset({
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        email: user.email ?? "",
        role_id: user.role_id ? String(user.role_id) : "",
        password: "",
        status: String(user.status ?? "1"),
      });
    } else if (!open) {
      reset(defaultValues);
    }
  }, [user, open, reset]);

  const onSubmit = async (values: UserFormValues) => {
    if (!isEdit && (!values.password || values.password.length < 12)) {
      toast.error(
        "Password is required and must be at least 12 characters for new users.",
      );
      return;
    }

    const payload: Partial<UserRecord> & { password?: string } = {
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      email: values.email.trim(),
      role_id: Number(values.role_id),
      status: Number(values.status),
    };

    if (values.password && values.password.trim()) {
      payload.password = values.password.trim();
    }

    if (isEdit && user?.id) {
      await updateMutation.mutateAsync({ ...payload, id: user.id });
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
        isEdit
          ? `Edit user: ${user?.first_name} ${user?.last_name || ""}`
          : "Add new user account"
      }
      description={
        isEdit
          ? "Update account details, role permissions, and active status."
          : "Create a login account and assign workspace role access."
      }
    >
      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <FormSection
              title="Personal Information"
              description="Basic profile identification for this user."
            >
              <FormGrid>
                <FormGridItem span={1}>
                  <RHFTextField
                    name="first_name"
                    label="First name"
                    placeholder="e.g. Alex"
                    required
                  />
                </FormGridItem>
                <FormGridItem span={1}>
                  <RHFTextField
                    name="last_name"
                    label="Last name"
                    placeholder="e.g. Morgan"
                    required
                  />
                </FormGridItem>
                <FormGridItem span={2}>
                  <RHFTextField
                    name="email"
                    label="Email address"
                    placeholder="alex.m@company.com"
                    required
                  />
                </FormGridItem>
              </FormGrid>
            </FormSection>

            <FormSection
              title="Access & Credentials"
              description="Role assignment and sign-in authentication."
            >
              <FormGrid>
                <FormGridItem span={1}>
                  <RHFAsyncSelect
                    name="role_id"
                    label="Assigned role"
                    endpoint="role/options"
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
                  <RHFPasswordField
                    name="password"
                    label={
                      isEdit
                        ? "New password (leave blank to keep current)"
                        : "Temporary password (minimum 12 characters)"
                    }
                    placeholder="••••••••••••"
                    required={!isEdit}
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
            submitLabel={isEdit ? "Save changes" : "Create user"}
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
