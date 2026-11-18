import { useState } from "react";
import {
  Bell,
  Check,
  ChevronDown,
  Copy,
  Eye,
  History,
  Pencil,
  RefreshCw,
  Trash2,
  KeyRound,
} from "lucide-react";
import { PasswordStrengthMeter } from "@/components/common/PasswordStrengthMeter";
import { RevealSecretDialog } from "@/components/credentials/RevealSecretDialog";
import { RotatePasswordDialog } from "@/components/credentials/RotatePasswordDialog";
import type { CredentialDto } from "@/api/credentials";
import { RowActionsMenu } from "@/components/common/RowActionsMenu";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/common/States";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  RHFCheckbox,
  RHFCheckboxGroup,
  RHFColorPicker,
  RHFCombobox,
  RHFCurrencyField,
  RHFDatePicker,
  RHFDateRangePicker,
  RHFFileUpload,
  RHFImageUpload,
  RHFMultiSelect,
  RHFNumberField,
  RHFOtpInput,
  RHFPasswordField,
  RHFPhoneInput,
  RHFRadioGroup,
  RHFSearchInput,
  RHFSegmentedControl,
  RHFSelect,
  RHFSwitch,
  RHFTagsInput,
  RHFTextArea,
  RHFTextField,
  RHFTimePicker,
} from "@/components/hook-form/fields";
import { useForm } from "react-hook-form";
import FormProvider from "@/components/hook-form/form-provider";
import { TableFilterPanel } from "@/components/common/TableFilters/TableFilterPanel";
import type {
  FilterField,
  FilterValues,
} from "@/components/common/TableFilters/types";
import {
  FormActions,
  FormGrid,
  FormSection,
} from "@/components/common/FormLayout";
import { KeyValueList, Timeline } from "@/components/common/DataDisplay";
import { StatCard } from "@/components/common/StatCard";
import { Laptop } from "lucide-react";

const tableFilterPreview: FilterField[] = [
  {
    key: "status",
    label: "Status",
    type: "status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
  {
    key: "department",
    label: "Department",
    type: "multiselect",
    options: [
      { value: "engineering", label: "Engineering" },
      { value: "operations", label: "Operations" },
    ],
  },
  { key: "created", label: "Created date", type: "daterange" },
  { key: "active_only", label: "Active only", type: "boolean" },
  { key: "name", label: "Name contains", type: "text" },
];

const mockDemoCredential: CredentialDto = {
  id: 1,
  label: "AWS Production Root",
  username: "admin@production.aws",
  credential_type_id: 1,
  credential_type: {
    id: 1,
    name: "Cloud Account",
    category: "cloud",
    expiry_days: 90,
    min_length: 12,
    require_complexity: true,
    requires_approval: true,
    allow_employee_submit: true,
    status: 1,
  },
  employee_id: 1,
  employee: {
    id: 1,
    first_name: "Jordan",
    last_name: "Lee",
    email: "jordan.lee@example.com",
    employee_code: "EMP-001",
  },
  provided_by: 1,
  approval_status: 2,
  must_change_on_first_use: false,
  status: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function DesignSystem() {
  const [confirm, setConfirm] = useState(false);
  const [modal, setModal] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("Overview");
  const [tableFilters, setTableFilters] = useState<FilterValues>({});
  const methods = useForm({
    mode: "onTouched",
    defaultValues: {
      name: "Jordan Lee",
      email: "",
      password: "",
      count: 4,
      price: 24.5,
      notes: "",
      status: "",
      alerts: true,
      accept: false,
      role: "admin",
      date: "",
      start: "",
      end: "",
      time: "",
      location: "",
      teams: [],
      tags: [],
      phone: "",
      otp: "",
      attachment: null,
      photo: null,
      color: "",
      segment: "month",
      permissions: [],
      review: "",
    },
  });
  return (
    <>
      <PageHeader
        title="Design system"
        description="Accessible foundations and reusable patterns for ITAM. Components are shown in their default, interactive, disabled, and feedback states."
      />
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">Buttons & actions</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Consistent hierarchy, feedback, and accessible focus.
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button>Primary action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link style</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
            <Button variant="outline" size="icon" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">Status & feedback</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Color is paired with clear status text.
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Badge>Default</Badge>
            <Badge variant="success">
              <Check className="h-3 w-3" />
              Active
            </Badge>
            <Badge variant="warning">Pending review</Badge>
            <Badge variant="danger">Error</Badge>
            <Badge variant="info">Information</Badge>
            <Badge variant="muted">Inactive</Badge>
            <Spinner label="Loading records" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">Form controls</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Labels stay visible; validation messages are announced inline.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <FormProvider
              methods={methods}
              onSubmit={methods.handleSubmit(() => undefined)}
              className="space-y-5"
            >
              <FormSection
                title="Identity"
                description="Required fields are marked and validated inline."
              >
                <FormGrid>
                  <RHFTextField
                    name="name"
                    label="Full name"
                    required
                    placeholder="Enter a name"
                    helperText="This is shown across your workspace."
                  />
                  <RHFTextField
                    name="email"
                    label="Email address"
                    type="email"
                    required
                    placeholder="name@company.com"
                  />
                  <RHFPasswordField
                    name="password"
                    label="Password"
                    required
                    showStrengthMeter
                    showGenerator
                    showCopy
                    policy={{ minLength: 12, requireComplexity: true }}
                    placeholder="At least 12 characters"
                  />
                </FormGrid>
              </FormSection>
              <FormSection
                title="Preferences"
                description="Use dedicated fields for dates, choices, money, and contact data."
              >
                <FormGrid>
                  <RHFNumberField name="count" label="Quantity" />
                  <RHFSelect
                    name="status"
                    label="Status"
                    options={[
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                    ]}
                  />
                  <RHFTextArea
                    name="notes"
                    label="Notes"
                    placeholder="Add additional context…"
                  />
                  <RHFCheckbox name="accept" label="I agree to the policy" />
                  <RHFSwitch
                    name="alerts"
                    label="Email notifications"
                    helperText="Receive important updates."
                  />
                  <RHFCurrencyField name="price" label="Monthly cost" />
                  <RHFCombobox
                    name="location"
                    label="Location"
                    options={[
                      { value: "New York", label: "New York" },
                      { value: "London", label: "London" },
                    ]}
                  />
                  <RHFMultiSelect
                    name="teams"
                    label="Teams"
                    options={[
                      { value: "it", label: "IT" },
                      { value: "hr", label: "People" },
                      { value: "ops", label: "Operations" },
                    ]}
                  />
                  <RHFDatePicker name="date" label="Start date" />
                  <RHFDateRangePicker
                    fromName="start"
                    toName="end"
                    label="Date range"
                  />
                  <RHFTimePicker name="time" label="Preferred time" />
                  <RHFPhoneInput name="phone" label="Phone number" />
                  <RHFSegmentedControl
                    name="segment"
                    label="View period"
                    options={[
                      { value: "week", label: "Week" },
                      { value: "month", label: "Month" },
                      { value: "year", label: "Year" },
                    ]}
                  />
                  <RHFRadioGroup
                    name="role"
                    label="Access role"
                    options={[
                      { value: "admin", label: "Admin" },
                      { value: "employee", label: "Employee" },
                    ]}
                  />
                  <RHFCheckboxGroup
                    name="permissions"
                    label="Permissions"
                    options={[
                      { value: "read", label: "Read" },
                      { value: "write", label: "Write" },
                    ]}
                  />
                  <RHFTagsInput name="tags" label="Tags" />
                  <RHFOtpInput name="otp" label="One-time code" />
                  <RHFFileUpload
                    name="attachment"
                    label="Attachment"
                    accept=".pdf,.csv"
                  />
                  <RHFImageUpload name="photo" label="Profile image" />
                  <RHFColorPicker name="color" label="Brand color" />
                  <RHFSearchInput name="review" label="Search" />
                </FormGrid>
              </FormSection>
              <FormActions
                submitting={methods.formState.isSubmitting}
                onCancel={() => methods.reset()}
              />
            </FormProvider>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">Table filters</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Collapsed, expanded, active chip, and responsive sheet states.
              </p>
            </div>
          </CardHeader>
          <div className="px-5 pb-5">
            <TableFilterPanel
              config={tableFilterPreview}
              value={tableFilters}
              onApply={setTableFilters}
              onReset={() => setTableFilters({})}
            />
          </div>
        </Card>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div>
                <h2 className="text-sm font-semibold">Cards & tabs</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Surfaces use restrained borders and layered shadows.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex border-b">
                {["Overview", "Settings", "Activity"].map((tab) => (
                  <Button
                    type="button"
                    variant="ghost"
                    role="tab"
                    aria-selected={selectedTab === tab}
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`min-h-11 border-b-2 px-4 text-sm ${selectedTab === tab ? "border-primary font-medium" : "border-transparent text-muted-foreground"}`}
                  >
                    {tab}
                  </Button>
                ))}
              </div>
              <div className="pt-4 text-sm text-muted-foreground">
                {selectedTab} content preview
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div>
                <h2 className="text-sm font-semibold">Empty state</h2>
              </div>
              <Button variant="outline" size="sm">
                <Copy className="h-4 w-4" />
                Copy pattern
              </Button>
            </CardHeader>
            <EmptyState
              title="Nothing here yet"
              description="A clear next step helps people move forward."
              action={
                <Button size="sm">
                  Create record <ChevronDown className="h-4 w-4" />
                </Button>
              }
            />
          </Card>
        </div>
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">Overlays</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Accessible dialogs with explicit actions and Escape support.
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" onClick={() => setModal(true)}>
              Open modal
            </Button>
            <Button variant="destructive" onClick={() => setConfirm(true)}>
              Open confirmation
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">
                StatCard, KeyValue & Timeline
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Standard display components for dashboards, detail overviews,
                and audit histories.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard
                label="Active hardware"
                value="142"
                change={12}
                icon={<Laptop className="h-4 w-4" />}
              />
              <StatCard
                label="Pending maintenance"
                value="7"
                change={-3}
                icon={<Bell className="h-4 w-4" />}
              />
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Detail Key-Value Overview
              </h3>
              <KeyValueList
                items={[
                  { label: "Asset serial number", value: "AST-009281" },
                  { label: "Assigned department", value: "Engineering" },
                  { label: "Warranty expiration", value: "2027-11-18" },
                ]}
              />
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Activity Timeline
              </h3>
              <Timeline
                items={[
                  {
                    id: 1,
                    title: "Asset created",
                    description: "Admin User created record AST-009281",
                    time: "10:00 AM",
                  },
                  {
                    id: 2,
                    title: "Hardware assigned",
                    description: "Hardware Manager assigned to John Doe",
                    time: "11:30 AM",
                  },
                ]}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">
                Row Actions Menu (Standardized)
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Portaled Radix DropdownMenu on desktop, bottom sheet drawer on
                mobile (&lt; 768px). Includes collision detection, keyboard
                navigation, single-open enforcement, icons, disabled tooltips,
                and separated destructive actions.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
                <div className="text-xs font-semibold text-muted-foreground">
                  Standard &amp; Destructive
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-card border">
                  <span className="text-sm font-medium">Standard Row</span>
                  <RowActionsMenu
                    actions={[
                      {
                        key: "view",
                        label: "View details",
                        icon: Eye,
                        onSelect: () => {},
                      },
                      {
                        key: "edit",
                        label: "Edit details",
                        icon: Pencil,
                        onSelect: () => {},
                      },
                      {
                        key: "delete",
                        label: "Delete record",
                        icon: Trash2,
                        destructive: true,
                        onSelect: () => setConfirm(true),
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
                <div className="text-xs font-semibold text-muted-foreground">
                  With Disabled Reason
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-card border">
                  <span className="text-sm font-medium">Restricted Row</span>
                  <RowActionsMenu
                    actions={[
                      {
                        key: "view",
                        label: "View details",
                        icon: Eye,
                        onSelect: () => {},
                      },
                      {
                        key: "rotate",
                        label: "Rotate password",
                        icon: RefreshCw,
                        disabled: true,
                        disabledReason: "Requires Super Admin permission",
                        onSelect: () => {},
                      },
                      {
                        key: "delete",
                        label: "Delete record",
                        icon: Trash2,
                        destructive: true,
                        onSelect: () => setConfirm(true),
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
                <div className="text-xs font-semibold text-muted-foreground">
                  Full Credential Action Suite
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-card border">
                  <span className="text-sm font-medium">Vault Item</span>
                  <RowActionsMenu
                    actions={[
                      {
                        key: "reveal",
                        label: "Reveal password",
                        icon: Eye,
                        onSelect: () => {},
                      },
                      {
                        key: "edit",
                        label: "Edit details",
                        icon: Pencil,
                        onSelect: () => {},
                      },
                      {
                        key: "rotate",
                        label: "Rotate password",
                        icon: RefreshCw,
                        onSelect: () => {},
                      },
                      {
                        key: "audit",
                        label: "View audit trail",
                        icon: History,
                        onSelect: () => {},
                      },
                      {
                        key: "delete",
                        label: "Delete / Revoke",
                        icon: Trash2,
                        destructive: true,
                        onSelect: () => setConfirm(true),
                      },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4 bg-muted/10 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">
                Table Overflow Boundary &amp; Upward Flip Test (Scroll
                container)
              </div>
              <p className="text-xs text-muted-foreground">
                The menu below renders inside an overflow-hidden table wrapper.
                When opened, it portals outside to the body and automatically
                flips upward if near the boundary, preventing clipping or
                unwanted scrollbars.
              </p>
              <div className="relative border rounded-md overflow-hidden bg-card">
                <div className="divide-y text-xs">
                  <div className="flex items-center justify-between p-2.5">
                    <span>Upper Row (opens downward normally)</span>
                    <RowActionsMenu
                      actions={[
                        {
                          key: "view",
                          label: "View details",
                          icon: Eye,
                          onSelect: () => {},
                        },
                        {
                          key: "edit",
                          label: "Edit details",
                          icon: Pencil,
                          onSelect: () => {},
                        },
                      ]}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2.5">
                    <span>Middle Row</span>
                    <RowActionsMenu
                      actions={[
                        {
                          key: "view",
                          label: "View details",
                          icon: Eye,
                          onSelect: () => {},
                        },
                        {
                          key: "edit",
                          label: "Edit details",
                          icon: Pencil,
                          onSelect: () => {},
                        },
                      ]}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-muted/30">
                    <span className="font-semibold text-primary">
                      Bottom-most Row (triggers upward collision flip)
                    </span>
                    <RowActionsMenu
                      actions={[
                        {
                          key: "view",
                          label: "View details",
                          icon: Eye,
                          onSelect: () => {},
                        },
                        {
                          key: "edit",
                          label: "Edit details",
                          icon: Pencil,
                          onSelect: () => {},
                        },
                        {
                          key: "history",
                          label: "Audit log",
                          icon: History,
                          onSelect: () => {},
                        },
                        {
                          key: "delete",
                          label: "Delete",
                          icon: Trash2,
                          destructive: true,
                          onSelect: () => setConfirm(true),
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">Color tokens</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Change the brand by editing --brand in index.css.
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Primary", "bg-primary"],
              ["Success", "bg-success"],
              ["Warning", "bg-warning"],
              ["Danger", "bg-danger"],
              ["Info", "bg-info"],
              ["Surface", "bg-card"],
              ["Muted", "bg-muted"],
              ["Border", "bg-border"],
            ].map(([label, color]) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-lg border p-3"
              >
                <span className={`h-7 w-7 rounded-md border ${color}`} />
                <span className="text-xs">{label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-sm font-semibold">
                Credential & Vault UX Primitives
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Phase 3 security controls: password generation, real-time
                entropy calculation, and tokenized audit badges.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">
                Password Strength Entropy Levels
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg border p-3 space-y-2">
                  <span className="text-xs font-mono">"pass"</span>
                  <PasswordStrengthMeter password="pass" />
                </div>
                <div className="rounded-lg border p-3 space-y-2">
                  <span className="text-xs font-mono">"password123"</span>
                  <PasswordStrengthMeter password="password123" />
                </div>
                <div className="rounded-lg border p-3 space-y-2">
                  <span className="text-xs font-mono">"SecurePass2026"</span>
                  <PasswordStrengthMeter password="SecurePass2026" />
                </div>
                <div className="rounded-lg border p-3 space-y-2">
                  <span className="text-xs font-mono">"vK9#mQ2$pL7!zX4@"</span>
                  <PasswordStrengthMeter password="vK9#mQ2$pL7!zX4@" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">
                Credential Governance & Expiry Badges
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">Approved</Badge>
                <Badge variant="warning">Pending Review</Badge>
                <Badge variant="outline">Needs Changes</Badge>
                <Badge variant="destructive">Rejected</Badge>
                <Badge variant="outline">Company Provided</Badge>
                <Badge variant="default">Employee Submitted</Badge>
                <Badge variant="muted">Auto-Approved</Badge>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">
                Security Action Dialogs
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setRevealOpen(true)}
                >
                  <KeyRound className="h-4 w-4 text-primary" />
                  Preview Reveal Secret Dialog
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setRotateOpen(true)}
                >
                  <RefreshCw className="h-4 w-4 text-primary" />
                  Preview Rotate Password Dialog
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        onConfirm={() => setConfirm(false)}
        title="Delete this record?"
        description="This action cannot be undone."
        variant="destructive"
        confirmText="Delete"
      />
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent>
          <DialogTitle className="text-lg font-semibold">
            Example modal
          </DialogTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Dialogs support keyboard dismissal and focus management.
          </p>
          <Button className="mt-5" onClick={() => setModal(false)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
      <RevealSecretDialog
        open={revealOpen}
        onOpenChange={setRevealOpen}
        credential={mockDemoCredential}
      />
      <RotatePasswordDialog
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        credential={mockDemoCredential}
      />
    </>
  );
}
