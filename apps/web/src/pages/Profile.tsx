import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  useUserSessions,
  useRevokeSession,
  useRevokeOtherSessions,
  useLoginHistory,
} from "@/hooks/queries/credentials";
import { Badge } from "@/components/ui/badge";
import { User, Lock, Palette, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RHFPasswordField, RHFTextField } from "@/components/hook-form/fields";
import {
  FormGrid,
  FormGridItem,
  FormSection,
} from "@/components/common/FormLayout";
import FormProvider from "@/components/hook-form/form-provider";
import { callApi } from "@/api/callApi";
import { endPoints } from "@/api/endpoint";
import useAuthStore from "@/zustand/user-store";
import type { User as UserType } from "@/types";
import {
  passwordSchema,
  profileSchema,
  type PasswordValues,
  type ProfileValues,
} from "@/pages/Profile.schema";

type Tab = "profile" | "security" | "preferences";

export function Profile() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const { theme, setTheme } = useTheme();
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const localUser = useAuthStore((state) => state.user);
  const client = useQueryClient();

  const sessionsQuery = useUserSessions();
  const revokeSessionMutation = useRevokeSession();
  const revokeOtherSessionsMutation = useRevokeOtherSessions();
  const loginHistoryQuery = useLoginHistory();

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const result = await callApi<UserType>({
        url: endPoints.user.profile,
        method: "GET",
      });
      if (!result.ok || !result.data) {
        throw new Error(result.message || "Unable to load profile");
      }
      return result.data;
    },
    initialData: localUser ?? undefined,
  });

  const profileForm = useForm<ProfileValues>({
    mode: "onTouched",
    resolver: yupResolver(profileSchema),
    values: profileQuery.data
      ? {
          first_name: profileQuery.data.first_name,
          last_name: profileQuery.data.last_name ?? "",
          email: profileQuery.data.email,
        }
      : undefined,
  });

  const passwordForm = useForm<PasswordValues>({
    mode: "onTouched",
    resolver: yupResolver(passwordSchema),
    defaultValues: {
      current_password: "",
      password: "",
      confirm_password: "",
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (values: ProfileValues) => {
      const response = await callApi<UserType, ProfileValues>({
        url: endPoints.user.updateProfile,
        method: "PUT",
        body: values,
      });
      if (!response.ok || !response.data) throw new Error(response.message);
      return response.data;
    },
    onSuccess: async (user) => {
      setUser(user);
      toast.success("Profile updated");
      await client.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const passwordMutation = useMutation({
    mutationFn: async ({ current_password, password }: PasswordValues) => {
      const response = await callApi<
        unknown,
        {
          current_password: string;
          new_password: string;
          confirm_password: string;
        }
      >({
        url: endPoints.user.changePassword,
        method: "PUT",
        body: {
          current_password,
          new_password: password,
          confirm_password: password,
        },
      });
      if (!response.ok) throw new Error(response.message);
      return response;
    },
    onSuccess: () => {
      passwordForm.reset();
      toast.success("Password changed. Please sign in again.");
      logout();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const tabs: Array<{
    id: Tab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "profile", label: "Personal Info", icon: User },
    { id: "security", label: "Security & Password", icon: Lock },
    { id: "preferences", label: "Preferences", icon: Palette },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile settings"
        description="Manage your personal information, security, and interface preferences."
        breadcrumbs={[
          { label: "Dashboard", to: "/" },
          { label: "Profile settings" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav
          aria-label="Profile navigation"
          className="flex gap-2 overflow-x-auto lg:flex-col lg:space-y-1"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                variant={isActive ? "secondary" : "ghost"}
                className={`justify-start gap-2.5 text-sm ${isActive ? "font-semibold" : "text-muted-foreground"}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </nav>

        <Card className="p-6">
          {profileQuery.error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
            >
              Saved profile data is shown, but the latest version could not be
              refreshed: {profileQuery.error.message}
            </div>
          )}

          {activeTab === "profile" && (
            <FormProvider
              methods={profileForm}
              onSubmit={profileForm.handleSubmit((values) =>
                profileMutation.mutate(values),
              )}
              className="max-w-2xl space-y-6"
            >
              <FormSection
                title="Personal Information"
                description="Update your basic account details and contact information."
              >
                <FormGrid>
                  <FormGridItem span={1}>
                    <RHFTextField
                      name="first_name"
                      label="First name"
                      required
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFTextField name="last_name" label="Last name" />
                  </FormGridItem>
                  <FormGridItem span={2}>
                    <RHFTextField
                      name="email"
                      label="Work email"
                      type="email"
                      required
                    />
                  </FormGridItem>
                </FormGrid>
              </FormSection>

              <div className="flex justify-end border-t pt-5">
                <Button
                  type="submit"
                  disabled={!profileForm.formState.isDirty}
                  loading={profileMutation.isPending}
                >
                  Save profile
                </Button>
              </div>
            </FormProvider>
          )}

          {activeTab === "security" && (
            <div className="space-y-8">
              <FormProvider
                methods={passwordForm}
                onSubmit={passwordForm.handleSubmit((values) =>
                  passwordMutation.mutate(values),
                )}
                className="max-w-xl space-y-6"
              >
                <FormSection
                  title="Change Password"
                  description="Choose a strong, unique password with at least twelve characters."
                >
                  <FormGrid cols={1}>
                    <FormGridItem span={1}>
                      <RHFPasswordField
                        name="current_password"
                        label="Current password"
                        required
                      />
                    </FormGridItem>
                    <FormGridItem span={1}>
                      <RHFPasswordField
                        name="password"
                        label="New password"
                        required
                      />
                    </FormGridItem>
                    <FormGridItem span={1}>
                      <RHFPasswordField
                        name="confirm_password"
                        label="Confirm new password"
                        required
                      />
                    </FormGridItem>
                  </FormGrid>
                </FormSection>

                <div className="flex justify-end border-t pt-5">
                  <Button
                    type="submit"
                    disabled={!passwordForm.formState.isDirty}
                    loading={passwordMutation.isPending}
                  >
                    Update password
                  </Button>
                </div>
              </FormProvider>

              {/* Active Sessions Hardening */}
              <div className="mt-8 pt-6 border-t max-w-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Active Sessions</h3>
                    <p className="text-xs text-muted-foreground">
                      Devices currently signed into your account.
                    </p>
                  </div>
                  {sessionsQuery.data && sessionsQuery.data.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => revokeOtherSessionsMutation.mutate()}
                      disabled={revokeOtherSessionsMutation.isPending}
                    >
                      Revoke Other Sessions
                    </Button>
                  )}
                </div>

                {sessionsQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground">
                    Loading active sessions...
                  </p>
                ) : sessionsQuery.data?.length ? (
                  <div className="divide-y rounded-lg border">
                    {sessionsQuery.data.map((sess) => (
                      <div
                        key={sess.id}
                        className="flex items-center justify-between p-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {sess.ip_address || "Unknown IP"}
                            </span>
                            {sess.is_current ? (
                              <Badge variant="success" className="text-[10px]">
                                Current Session
                              </Badge>
                            ) : null}
                          </div>
                          <p
                            className="text-muted-foreground max-w-sm truncate"
                            title={sess.user_agent || ""}
                          >
                            {sess.user_agent || "Web Browser"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Last active:{" "}
                            {sess.last_active_at
                              ? new Date(sess.last_active_at).toLocaleString()
                              : "Recently"}
                          </p>
                        </div>

                        {!sess.is_current && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:bg-destructive/10 h-7"
                            onClick={() =>
                              revokeSessionMutation.mutate(sess.id)
                            }
                            disabled={revokeSessionMutation.isPending}
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No active sessions found.
                  </p>
                )}

                {/* Login History */}
                <div className="pt-6 border-t space-y-3">
                  <h3 className="text-sm font-semibold">
                    Recent Login History
                  </h3>
                  {loginHistoryQuery.isLoading ? (
                    <p className="text-xs text-muted-foreground">
                      Loading history...
                    </p>
                  ) : loginHistoryQuery.data?.length ? (
                    <div className="divide-y rounded-lg border max-h-48 overflow-y-auto">
                      {loginHistoryQuery.data.slice(0, 10).map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-2.5 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {log.success ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-destructive" />
                              )}
                              <span className="font-medium">
                                {log.success
                                  ? "Successful Sign-in"
                                  : "Failed Attempt"}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              IP: {log.ip_address || "—"} ·{" "}
                              {new Date(log.created_at).toLocaleString()}
                            </p>
                          </div>
                          {log.failure_reason && (
                            <span className="text-[10px] text-destructive">
                              {log.failure_reason}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No login history recorded.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Appearance & Theme
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose your interface theme. Your preference is automatically
                  saved in your browser.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                {(["light", "dark", "system"] as const).map((item) => {
                  const isSelected = theme === item;
                  return (
                    <Button
                      key={item}
                      type="button"
                      variant={isSelected ? "primary" : "outline"}
                      className="capitalize min-w-[100px] h-12"
                      onClick={() => setTheme(item)}
                    >
                      {item}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
