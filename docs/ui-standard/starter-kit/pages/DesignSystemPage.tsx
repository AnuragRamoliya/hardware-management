import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Card, CardHeader, CardContent } from "../components/ui/Card";
import { DatePicker } from "../components/ui/date-picker";
import { PhoneField } from "../components/ui/phone-field";
import { CommonTable } from "../components/common/CommonTable";
import { FormProvider } from "../components/hook-form/FormProvider";
import {
  RHFTextField,
  RHFCheckbox,
  RHFSwitch,
} from "../components/hook-form/fields";
import { RHFDatePicker } from "../components/hook-form/RHFDatePicker";
import { RHFPhoneField } from "../components/hook-form/RHFPhoneField";

export function DesignSystemPage() {
  const methods = useForm({
    defaultValues: {
      username: "alex.doe",
      phone: "+919876543210",
      joiningDate: "2026-01-15",
      marketingEmails: true,
      activeStatus: true,
    },
  });

  const sampleTableData = [
    {
      id: "1",
      name: "Dell Latitude 5420",
      category: "Hardware",
      status: "Active",
    },
    {
      id: "2",
      name: "MacBook Pro 16",
      category: "Hardware",
      status: "In Maintenance",
    },
    {
      id: "3",
      name: "Slack Enterprise",
      category: "Software",
      status: "Active",
    },
  ];

  const tableColumns = [
    { key: "id", header: "ID", sortable: true },
    { key: "name", header: "Name", sortable: true },
    { key: "category", header: "Category", sortable: true },
    {
      key: "status",
      header: "Status",
      render: (row: any) => (
        <Badge variant={row.status === "Active" ? "default" : "outline"}>
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-8 space-y-10 max-w-5xl">
      <header className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Starter Kit Design System
        </h1>
        <p className="text-muted-foreground mt-1">
          Portable UI Primitives, Hook-Form Fields, and Data Patterns
        </p>
      </header>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Buttons & Badges</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Badge variant="default">Active</Badge>
          <Badge variant="outline">Draft</Badge>
          <Badge variant="destructive">Error</Badge>
        </div>
      </section>

      {/* Standard Fields */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Standalone Primitives</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input placeholder="Standalone Input" defaultValue="Sample value" />
          <DatePicker value="2026-11-24" onChange={() => {}} />
          <PhoneField value="+919876543210" onChange={() => {}} />
        </div>
      </section>

      {/* RHF Form */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          3. React Hook Form Integration
        </h2>
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">User Profile Form</h3>
          </CardHeader>
          <CardContent>
            <FormProvider
              methods={methods}
              onSubmit={methods.handleSubmit((data) => console.log(data))}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RHFTextField name="username" label="User Name" required />
                <RHFPhoneField name="phone" label="Phone Number" required />
                <RHFDatePicker name="joiningDate" label="Joining Date" />
                <div className="pt-6">
                  <RHFCheckbox
                    name="marketingEmails"
                    label="Subscribe to release updates"
                  />
                </div>
                <div className="md:col-span-2">
                  <RHFSwitch
                    name="activeStatus"
                    label="User Account Active"
                    helperText="Enable access to hardware store"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button type="submit">Save Profile</Button>
              </div>
            </FormProvider>
          </CardContent>
        </Card>
      </section>

      {/* CommonTable */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Data Table Pattern</h2>
        <CommonTable columns={tableColumns} data={sampleTableData} />
      </section>
    </div>
  );
}
export default DesignSystemPage;
