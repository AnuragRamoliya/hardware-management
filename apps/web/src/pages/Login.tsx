import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RHFPasswordField, RHFTextField } from "@/components/hook-form/fields";
import FormProvider from "@/components/hook-form/form-provider";
import { FormSection } from "@/components/common/FormLayout";
import { loginApi } from "@/api/auth";
import useAuthStore from "@/zustand/user-store";
import { PATHS } from "@/routes/paths";
import { loginSchema, type LoginFormValues } from "@/pages/Login.schema";

export function Login() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const methods = useForm<LoginFormValues>({
    mode: "onTouched",
    resolver: yupResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const submit = methods.handleSubmit(async (values) => {
    const result = await loginApi(values);
    if (!result.ok || !result.data) {
      toast.error(result.message || "Unable to sign in");
      return;
    }
    const payload = result.data;
    const token = payload.token ?? payload.access_token;
    const user = payload.user_info ?? payload.user;
    if (!token || !user) {
      toast.error("The server returned an incomplete sign-in response.");
      return;
    }
    setSession(token, payload.refresh_token ?? null, user);
    navigate(PATHS.ROOT, { replace: true });
  });
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[hsl(var(--login-panel))] p-12 text-[hsl(var(--login-panel-foreground))] lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm text-primary-foreground">
            IT
          </span>
          itam<span className="text-primary">.</span>
        </div>
        <div className="relative z-10 max-w-md">
          <p className="text-sm font-medium text-[hsl(var(--login-panel-foreground)/.88)]">
            A clearer view of your IT
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-[-.04em]">
            Everything your team needs. All in one place.
          </h1>
          <p className="mt-5 text-sm leading-6 text-[hsl(var(--login-panel-foreground)/.72)]">
            A calm, secure workspace for people, devices, and the details that
            keep work moving.
          </p>
        </div>
        <div className="text-xs text-[hsl(var(--login-panel-foreground)/.72)]">
          Trusted asset operations for growing teams
        </div>
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      </aside>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[390px]">
          <div className="mb-10 flex items-center gap-2 font-semibold lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-xs text-primary-foreground">
              IT
            </span>
            itam<span className="text-primary">.</span>
          </div>
          <p className="text-sm font-medium text-primary">Welcome back</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-.04em]">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your details below to continue.
          </p>
          <FormProvider
            methods={methods}
            className="mt-8 space-y-5"
            onSubmit={submit}
          >
            <FormSection title="Sign-in details">
              <RHFTextField
                name="email"
                label="Work email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                autoFocus
              />
              <div className="space-y-2">
                <div className="flex justify-end">
                  <Link
                    to={PATHS.FORGOT_PASSWORD}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <RHFPasswordField
                  name="password"
                  label="Password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </FormSection>
            <Button
              className="w-full"
              type="submit"
              loading={methods.formState.isSubmitting}
            >
              Sign in
            </Button>
          </FormProvider>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Protected by your organization’s security policies.
          </p>
        </div>
      </section>
    </main>
  );
}
