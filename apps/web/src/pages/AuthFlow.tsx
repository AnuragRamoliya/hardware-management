import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { forgotPasswordApi, resetPasswordApi, verifyOtpApi } from "@/api/auth";
import { PATHS } from "@/routes/paths";

type AuthFields = {
  email: string;
  otp?: string;
  password?: string;
  confirmPassword?: string;
};

function AuthFlowPage({ mode }: { mode: "forgot" | "otp" | "reset" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState =
    (location.state as {
      email?: string;
      otp?: string;
      otp_reference?: string;
      reset_token?: string;
    } | null) ?? {};
  const emailFromState = routeState.email ?? "";
  const schema =
    mode === "forgot"
      ? yup.object({
          email: yup
            .string()
            .email("Enter a valid email")
            .required("Email is required"),
        })
      : mode === "otp"
        ? yup.object({
            email: yup.string().email().required(),
            otp: yup
              .string()
              .length(6, "Enter the 6-digit code")
              .required("Code is required"),
          })
        : yup.object({
            email: yup.string().email().required(),
            password: yup
              .string()
              .min(12, "Use at least 12 characters")
              .required("Password is required"),
            confirmPassword: yup
              .string()
              .oneOf([yup.ref("password")], "Passwords must match")
              .required("Confirm your password"),
          });
  const methods = useForm<AuthFields>({
    mode: "onTouched",
    resolver: yupResolver(schema),
    defaultValues: {
      email: emailFromState,
      otp: routeState.otp ?? "",
      password: "",
      confirmPassword: "",
    },
  });
  const submit = methods.handleSubmit(
    async ({ email, otp = "", password = "", confirmPassword = "" }) => {
      const result =
        mode === "forgot"
          ? await forgotPasswordApi({ email })
          : mode === "otp"
            ? await verifyOtpApi({
                otp,
                otp_reference: routeState.otp_reference ?? "",
              })
            : await resetPasswordApi({
                reset_token: routeState.reset_token ?? "",
                new_password: password,
                confirm_password: confirmPassword,
              });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const nextState =
        mode === "forgot"
          ? {
              email,
              otp_reference: (result.data as { otp_reference?: string } | null)
                ?.otp_reference,
              otp: (result.data as { otp?: string } | null)?.otp,
            }
          : mode === "otp"
            ? {
                email,
                reset_token: (result.data as { reset_token?: string } | null)
                  ?.reset_token,
              }
            : { email };
      if (
        mode === "forgot" &&
        !(nextState as { otp_reference?: string }).otp_reference
      ) {
        toast.error("The server did not return an OTP reference.");
        return;
      }
      if (
        mode === "otp" &&
        !(nextState as { reset_token?: string }).reset_token
      ) {
        toast.error("The server did not return a password reset token.");
        return;
      }
      toast.success(
        result.message ||
          (mode === "reset"
            ? "Password updated"
            : "Check your email for the next step"),
      );
      navigate(
        mode === "forgot"
          ? PATHS.OTP_VERIFICATION
          : mode === "otp"
            ? PATHS.RESET_PASSWORD
            : PATHS.LOGIN,
        { state: nextState, replace: true },
      );
    },
  );
  const title =
    mode === "forgot"
      ? "Reset your password"
      : mode === "otp"
        ? "Verify your email"
        : "Create a new password";
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-[420px] rounded-2xl border bg-card p-7 shadow-soft sm:p-9">
        <Link
          to={PATHS.LOGIN}
          className="mb-8 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
        <p className="text-sm font-medium text-primary">Account recovery</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {mode === "forgot"
            ? "We’ll send a one-time verification code to your work email."
            : mode === "otp"
              ? "Enter the six-digit code sent to your email address."
              : "Choose a strong password you have not used before."}
        </p>
        <form className="mt-7 space-y-4" onSubmit={submit} noValidate>
          <Field
            name="email"
            label="Work email"
            methods={methods}
            type="email"
            disabled={mode !== "forgot" && Boolean(emailFromState)}
          />
          {mode === "otp" && (
            <Field name="otp" label="Verification code" methods={methods} />
          )}
          {mode === "reset" && (
            <>
              <Field
                name="password"
                label="New password"
                methods={methods}
                type="password"
              />
              <Field
                name="confirmPassword"
                label="Confirm password"
                methods={methods}
                type="password"
              />
            </>
          )}
          <Button
            className="w-full"
            type="submit"
            loading={methods.formState.isSubmitting}
          >
            {mode === "forgot"
              ? "Send code"
              : mode === "otp"
                ? "Verify code"
                : "Update password"}
          </Button>
        </form>
      </section>
    </main>
  );
}
function Field({
  name,
  label,
  methods,
  type = "text",
  disabled = false,
}: {
  name: keyof AuthFields;
  label: string;
  methods: ReturnType<typeof useForm<AuthFields>>;
  type?: string;
  disabled?: boolean;
}) {
  const error = methods.formState.errors[name];
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-[13px] font-medium">
        {label}
      </label>
      <Input
        id={name}
        type={type}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        {...methods.register(name)}
      />
      {error?.message && (
        <p className="mt-1 text-xs text-danger">{error.message}</p>
      )}
    </div>
  );
}
export const ForgotPassword = () => <AuthFlowPage mode="forgot" />;
export const OtpVerification = () => <AuthFlowPage mode="otp" />;
export const ResetPassword = () => <AuthFlowPage mode="reset" />;
