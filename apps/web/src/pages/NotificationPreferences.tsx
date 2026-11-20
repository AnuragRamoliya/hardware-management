import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Volume2,
  Inbox,
  Laptop,
  KeyRound,
  UserX,
  Cog,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/queries/offboarding";
import { playChime } from "@/lib/realtime";
import { PATHS } from "@/routes/paths";

export function NotificationPreferences() {
  const { data, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  const [categories, setCategories] = useState({
    requests: true,
    assets: true,
    credentials: true,
    offboarding: true,
    system: true,
  });

  const [channels, setChannels] = useState({
    toast: true,
    sound: true,
  });

  useEffect(() => {
    if (data) {
      if (data.categories) {
        setCategories((prev) => ({ ...prev, ...data.categories }));
      }
      if (data.channels) {
        setChannels((prev) => ({ ...prev, ...data.channels }));
      }
    }
  }, [data]);

  const handleCategoryChange = (key: keyof typeof categories, val: boolean) => {
    const updated = { ...categories, [key]: val };
    setCategories(updated);
    updateMutation.mutate({ categories: { [key]: val } });
  };

  const handleChannelChange = (key: keyof typeof channels, val: boolean) => {
    const updated = { ...channels, [key]: val };
    setChannels(updated);
    if (key === "sound" && val) {
      playChime("success");
    }
    updateMutation.mutate({ channels: { [key]: val } });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Notification Preferences"
        description="Configure which events notify you and choose your preferred notification channels."
        breadcrumbs={[
          { label: "Dashboard", to: "/" },
          { label: "Notifications", to: PATHS.NOTIFICATIONS },
          { label: "Preferences" },
        ]}
        action={
          <Link to={PATHS.NOTIFICATIONS}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Notifications
            </Button>
          </Link>
        }
      />

      {/* Notification Channels */}
      <Card className="p-6">
        <h3 className="mb-4 text-base font-semibold text-foreground">
          Delivery Channels
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">In-app Toasts</Label>
              <p className="text-xs text-muted-foreground">
                Display floating toast banners in the top-right corner when
                events occur.
              </p>
            </div>
            <Switch
              checked={channels.toast}
              onCheckedChange={(checked) =>
                handleChannelChange("toast", checked)
              }
              disabled={isLoading || updateMutation.isPending}
            />
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Audio Chimes</Label>
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Synthesized Web Audio notification chimes on alerts, barcode
                scans, and updates.
              </p>
            </div>
            <Switch
              checked={channels.sound}
              onCheckedChange={(checked) =>
                handleChannelChange("sound", checked)
              }
              disabled={isLoading || updateMutation.isPending}
            />
          </div>
        </div>
      </Card>

      {/* Event Categories */}
      <Card className="p-6">
        <h3 className="mb-4 text-base font-semibold text-foreground">
          Subscribed Categories
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Inbox className="h-5 w-5 text-primary" />
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Request Workflows</Label>
                <p className="text-xs text-muted-foreground">
                  New requests, assignments, approvals, status updates, and
                  comments.
                </p>
              </div>
            </div>
            <Switch
              checked={categories.requests}
              onCheckedChange={(checked) =>
                handleCategoryChange("requests", checked)
              }
              disabled={isLoading || updateMutation.isPending}
            />
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Laptop className="h-5 w-5 text-info" />
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Hardware Assets</Label>
                <p className="text-xs text-muted-foreground">
                  Asset assignment, return, repair statuses, and maintenance
                  events.
                </p>
              </div>
            </div>
            <Switch
              checked={categories.assets}
              onCheckedChange={(checked) =>
                handleCategoryChange("assets", checked)
              }
              disabled={isLoading || updateMutation.isPending}
            />
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-warning" />
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Credential Vault</Label>
                <p className="text-xs text-muted-foreground">
                  Access requests, approvals, password rotation, and expiration
                  notices.
                </p>
              </div>
            </div>
            <Switch
              checked={categories.credentials}
              onCheckedChange={(checked) =>
                handleCategoryChange("credentials", checked)
              }
              disabled={isLoading || updateMutation.isPending}
            />
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserX className="h-5 w-5 text-destructive" />
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  Offboarding Lifecycle
                </Label>
                <p className="text-xs text-muted-foreground">
                  Initiations, task clearances, return check-ins, and clearance
                  issuance.
                </p>
              </div>
            </div>
            <Switch
              checked={categories.offboarding}
              onCheckedChange={(checked) =>
                handleCategoryChange("offboarding", checked)
              }
              disabled={isLoading || updateMutation.isPending}
            />
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cog className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">System & Security</Label>
                <p className="text-xs text-muted-foreground">
                  Session revocation, daily offboarding sweep reports, and role
                  changes.
                </p>
              </div>
            </div>
            <Switch
              checked={categories.system}
              onCheckedChange={(checked) =>
                handleCategoryChange("system", checked)
              }
              disabled={isLoading || updateMutation.isPending}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
