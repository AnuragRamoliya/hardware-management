import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  RHFSelect,
  RHFTextArea,
  RHFSwitch,
} from "@/components/hook-form/fields";
import { useOffboardingTemplates } from "@/hooks/queries/offboarding";
import { offboardingApi, type OffboardingTemplateDto } from "@/api/offboarding";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const schema = yup.object().shape({
  title: yup.string().required("Title is required"),
  description: yup.string().optional(),
  default_assignee_role: yup.string().optional(),
  is_mandatory: yup.boolean().default(false),
  sort_order: yup.number().default(0),
});

type FormValues = {
  title: string;
  description?: string;
  default_assignee_role?: string;
  is_mandatory: boolean;
  sort_order: number;
};

const defaultFormValues: FormValues = {
  title: "",
  description: "",
  default_assignee_role: "hardware_manager",
  is_mandatory: false,
  sort_order: 0,
};

const roleOptions = [
  { value: "hardware_manager", label: "Hardware Manager" },
  { value: "hr", label: "HR Specialist" },
  { value: "admin", label: "System Administrator" },
  { value: "employee", label: "Employee Handover" },
];

export function OffboardingTemplates() {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<OffboardingTemplateDto | null>(null);
  const [deletingTemplate, setDeletingTemplate] =
    useState<OffboardingTemplateDto | null>(null);

  const { data, isLoading } = useOffboardingTemplates({
    currentPage: 1,
    itemsPerPage: 50,
    sortBy: [],
    filters: {},
  });

  const methods = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: defaultFormValues,
  });

  const addMutation = useMutation({
    mutationFn: (values: FormValues) => offboardingApi.addTemplate(values),
    onSuccess: () => {
      toast.success("Template created");
      void queryClient.invalidateQueries({
        queryKey: ["offboarding-templates"],
      });
      setDrawerOpen(false);
      methods.reset(defaultFormValues);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormValues & { id: number }) =>
      offboardingApi.updateTemplate(values),
    onSuccess: () => {
      toast.success("Template updated");
      void queryClient.invalidateQueries({
        queryKey: ["offboarding-templates"],
      });
      setDrawerOpen(false);
      methods.reset(defaultFormValues);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => offboardingApi.deleteTemplate(id),
    onSuccess: () => {
      toast.success("Template deleted");
      void queryClient.invalidateQueries({
        queryKey: ["offboarding-templates"],
      });
      setDeletingTemplate(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    methods.reset(defaultFormValues);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (t: OffboardingTemplateDto) => {
    setEditingTemplate(t);
    methods.reset({
      title: t.title,
      description: t.description || "",
      default_assignee_role: t.default_assignee_role || "hardware_manager",
      is_mandatory: Boolean(t.is_mandatory),
      sort_order: t.sort_order || 0,
    });
    setDrawerOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    if (editingTemplate) {
      await updateMutation.mutateAsync({ ...values, id: editingTemplate.id });
    } else {
      await addMutation.mutateAsync(values);
    }
  };

  const templates = data?.list || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklist Templates"
        description="Configure standard offboarding checklist tasks and assignment roles."
        breadcrumbs={[
          { label: "Dashboard", to: "/" },
          { label: "Offboarding" },
          { label: "Templates" },
        ]}
        action={
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Template
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No checklist templates found. Create one to get started.
            </div>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {t.title}
                    </span>
                    {t.is_mandatory && (
                      <Badge variant="warning" className="text-[10px]">
                        Mandatory
                      </Badge>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground">
                      {t.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Default Assignee:{" "}
                    <span className="font-medium text-foreground">
                      {t.default_assignee_role || "Hardware Manager"}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(t)}
                    className="gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeletingTemplate(t)}
                    className="gap-1.5 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Drawer */}
      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editingTemplate ? "Edit Template" : "New Checklist Template"}
        description="Define task attributes and automatic default assignments."
      >
        <FormProvider
          methods={methods}
          onSubmit={methods.handleSubmit(onSubmit)}
        >
          <div className="space-y-6 pb-20">
            <FormSection title="Template Details">
              <FormGrid cols={1}>
                <FormGridItem>
                  <RHFTextField name="title" label="Task Title" required />
                </FormGridItem>
                <FormGridItem>
                  <RHFTextArea
                    name="description"
                    label="Description / Checklist Instructions"
                    rows={3}
                  />
                </FormGridItem>
                <FormGridItem>
                  <RHFSelect
                    name="default_assignee_role"
                    label="Default Assignee Role"
                    options={roleOptions}
                  />
                </FormGridItem>
                <FormGridItem>
                  <RHFSwitch
                    name="is_mandatory"
                    label="Mandatory Task"
                    helperText="Mandatory tasks must be completed or waived before clearance certificate issuance."
                  />
                </FormGridItem>
              </FormGrid>
            </FormSection>
          </div>

          <FormActions
            isSubmitting={addMutation.isPending || updateMutation.isPending}
            submitLabel={editingTemplate ? "Save Changes" : "Create Template"}
            onCancel={() => setDrawerOpen(false)}
          />
        </FormProvider>
      </Drawer>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={Boolean(deletingTemplate)}
        onOpenChange={(open) => !open && setDeletingTemplate(null)}
        title="Delete template"
        description={`Are you sure you want to delete template "${deletingTemplate?.title}"?`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deletingTemplate) deleteMutation.mutate(deletingTemplate.id);
        }}
      />
    </div>
  );
}
