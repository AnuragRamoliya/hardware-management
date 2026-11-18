import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RHFPasswordField, RHFTextField } from "@/components/hook-form/fields";
import FormProvider from "@/components/hook-form/form-provider";
import { callApi } from "@/api/callApi";
import { endPoints } from "@/api/endpoint";
import useAuthStore from "@/zustand/user-store";
import type { User } from "@/types";
import { passwordSchema, profileSchema, type PasswordValues, type ProfileValues } from "@/pages/Profile.schema";

export function Profile() {
  const [activeTab, setActiveTab] = useState<
    "profile" | "security" | "preferences"
  >("profile");
  const { theme, setTheme } = useTheme();
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const localUser = useAuthStore((state) => state.user);
  const client = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const result = await callApi<User>({
        url: endPoints.user.profile,
        method: "GET",
      });
      if (!result.ok || !result.data)
        throw new Error(result.message || "Unable to load profile");
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
    defaultValues: { current_password: "", password: "", confirm_password: "" },
  });
  const profileMutation = useMutation({
    mutationFn: async (values: ProfileValues) => {
      const response = await callApi<User, ProfileValues>({
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
    onError: (error) => toast.error(error.message),
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
    onError: (error) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader
        title="Profile settings"
        description="Manage your personal information, security, and preferences."
      />
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <nav
          aria-label="Profile settings"
          className="flex gap-1 overflow-x-auto lg:block lg:space-y-1"
        >
          {(["profile", "security", "preferences"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`min-h-10 shrink-0 rounded-lg px-3 text-left text-sm capitalize lg:w-full ${activeTab === tab ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {tab}
            </button>
          ))}
        </nav>
        <Card className="p-5 sm:p-7">
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
            <>
              <h2 className="font-semibold">Personal information</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Update the information associated with your account.
              </p>
              <FormProvider
                methods={profileForm}
                onSubmit={profileForm.handleSubmit((values) =>
                  profileMutation.mutate(values),
                )}
                className="mt-6 max-w-2xl space-y-5"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <RHFTextField name="first_name" label="First name" required />
                  <RHFTextField name="last_name" label="Last name" />
                  <div className="sm:col-span-2">
                    <RHFTextField
                      name="email"
                      label="Work email"
                      type="email"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end border-t pt-5">
                  <Button type="submit" loading={profileMutation.isPending}>
                    Save profile
                  </Button>
                </div>
              </FormProvider>
            </>
          )}
          {activeTab === "security" && (
            <>
              <h2 className="font-semibold">Change password</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a unique password with at least twelve characters.
              </p>
              <FormProvider
                methods={passwordForm}
                onSubmit={passwordForm.handleSubmit((values) =>
                  passwordMutation.mutate(values),
                )}
                className="mt-6 max-w-lg space-y-5"
              >
                <RHFPasswordField
                  name="current_password"
                  label="Current password"
                  required
                />
                <RHFPasswordField
                  name="password"
                  label="New password"
                  required
                />
                <RHFPasswordField
                  name="confirm_password"
                  label="Confirm new password"
                  required
                />
                <div className="flex justify-end border-t pt-5">
                  <Button type="submit" loading={passwordMutation.isPending}>
                    Update password
                  </Button>
                </div>
              </FormProvider>
            </>
          )}
          {activeTab === "preferences" && (
            <>
              <h2 className="font-semibold">Appearance</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a theme for this browser. Your choice is saved
                automatically.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {(["light", "dark", "system"] as const).map((item) => (
                  <button
                    key={item}
                    aria-pressed={theme === item}
                    className={`rounded-lg border px-5 py-4 text-sm capitalize ${theme === item ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                    onClick={() => setTheme(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
