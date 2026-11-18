import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, RefreshCw, KeyRound } from "lucide-react";
import { credentialSchema } from "./Credential.schema";
import {
  useAddCredential,
  useUpdateCredential,
  useCredentialTypeOptions,
} from "@/hooks/queries/credentials";
import type { CredentialDto } from "@/api/credentials";
import { SelectFilter } from "@/components/common/SelectFilter";

interface AddEditCredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialDto | null;
  defaultEmployeeId?: number;
}

function calculatePasswordStrength(pass: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!pass) return { score: 0, label: "Empty", color: "bg-muted" };
  let score = 0;
  if (pass.length >= 12) score += 1;
  if (pass.length >= 16) score += 1;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pass)) score += 1;

  if (score <= 2) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score === 3) return { score: 2, label: "Fair", color: "bg-amber-500" };
  if (score === 4) return { score: 3, label: "Good", color: "bg-blue-500" };
  return { score: 4, label: "Strong", color: "bg-green-500" };
}

function generateSecureRandomPassword(length = 16): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~|}{[]:;?><,./-=";
  let result = "";
  const cryptoObj =
    window.crypto || (window as unknown as { msCrypto: Crypto }).msCrypto;
  const values = new Uint32Array(length);
  cryptoObj.getRandomValues(values);
  for (let i = 0; i < length; i++) {
    result += chars.charAt(values[i]! % chars.length);
  }
  return result;
}

export function AddEditCredentialDialog({
  open,
  onOpenChange,
  credential,
  defaultEmployeeId,
}: AddEditCredentialDialogProps) {
  const isEditing = Boolean(credential);
  const [showPassword, setShowPassword] = useState(false);

  const { data: typeOptions = [] } = useCredentialTypeOptions();
  const addMutation = useAddCredential();
  const updateMutation = useUpdateCredential();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(credentialSchema),
    context: { isEditing },
    defaultValues: {
      employee_id: defaultEmployeeId || undefined,
      credential_type_id: undefined,
      label: "",
      username: "",
      password: "",
      url: "",
      software_id: undefined,
      asset_id: undefined,
      notes: "",
      must_change_on_first_use: false,
      expires_at: "",
    },
  });

  const watchedPassword = watch("password") || "";
  const strength = calculatePasswordStrength(watchedPassword);

  useEffect(() => {
    if (open) {
      if (credential) {
        reset({
          employee_id: credential.employee_id,
          credential_type_id: credential.credential_type_id,
          label: credential.label,
          username: credential.username,
          password: "",
          url: credential.url || "",
          software_id: credential.software_id || undefined,
          asset_id: credential.asset_id || undefined,
          notes: credential.notes || "",
          must_change_on_first_use: Boolean(
            credential.must_change_on_first_use,
          ),
          expires_at: credential.expires_at
            ? credential.expires_at.split("T")[0]
            : "",
        });
      } else {
        reset({
          employee_id: defaultEmployeeId || undefined,
          credential_type_id: undefined,
          label: "",
          username: "",
          password: generateSecureRandomPassword(16),
          url: "",
          software_id: undefined,
          asset_id: undefined,
          notes: "",
          must_change_on_first_use: true,
          expires_at: "",
        });
      }
    }
  }, [open, credential, defaultEmployeeId, reset]);

  const onSubmit = async (values: Record<string, unknown>) => {
    try {
      if (isEditing && credential) {
        await updateMutation.mutateAsync({
          id: credential.id,
          ...values,
        });
      } else {
        await addMutation.mutateAsync(values);
      }
      onOpenChange(false);
    } catch {
      // toast handled in mutation
    }
  };

  const handleGeneratePassword = () => {
    const newPass = generateSecureRandomPassword(16);
    setValue("password", newPass, { shouldValidate: true });
    setShowPassword(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <DialogTitle>
              {isEditing
                ? "Edit Credential Details"
                : "Create Company Credential"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isEditing
              ? "Update account metadata. (Use rotate password action to change the secret)."
              : "Register and encrypt a new company-provided account. Row-bound with AES-256-GCM."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {!defaultEmployeeId && !isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="employee_id">
                Assign to Employee <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="employee_id"
                control={control}
                render={({ field }) => (
                  <SelectFilter
                    endpoint="employee/options"
                    value={field.value ? String(field.value) : undefined}
                    onChange={(val?: string) =>
                      field.onChange(val ? Number(val) : undefined)
                    }
                    placeholder="Select employee..."
                  />
                )}
              />
              {errors.employee_id && (
                <p className="text-xs text-destructive">
                  {errors.employee_id.message}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="credential_type_id">
                Credential Type <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="credential_type_id"
                control={control}
                render={({ field }) => (
                  <NativeSelect
                    id="credential_type_id"
                    value={field.value || ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                  >
                    <option value="">Select type...</option>
                    {typeOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category})
                      </option>
                    ))}
                  </NativeSelect>
                )}
              />
              {errors.credential_type_id && (
                <p className="text-xs text-destructive">
                  {errors.credential_type_id.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="label">
                Account / Service Label{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="label"
                {...register("label")}
                placeholder="e.g. AWS Production, Office365, VPN"
              />
              {errors.label && (
                <p className="text-xs text-destructive">
                  {errors.label.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">
                Username / Email / Identity{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="username"
                {...register("username")}
                placeholder="e.g. john.doe@acme.com"
              />
              {errors.username && (
                <p className="text-xs text-destructive">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="url">Login URL</Label>
              <Input
                id="url"
                {...register("url")}
                placeholder="https://auth.company.com"
              />
              {errors.url && (
                <p className="text-xs text-destructive">{errors.url.message}</p>
              )}
            </div>
          </div>

          {!isEditing && (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">
                  Initial Password <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs flex items-center gap-1 text-primary"
                  onClick={handleGeneratePassword}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Generate Secure
                </Button>
              </div>

              <div className="relative flex items-center">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="Enter or generate password"
                  className="pr-10 font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 h-8 w-8"
                  onClick={() => setShowPassword((p) => !p)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}

              {watchedPassword && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Password Strength</span>
                    <span className="font-medium">{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: `${(strength.score / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="expires_at">Expiration Date</Label>
              <Input id="expires_at" type="date" {...register("expires_at")} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg mt-auto">
              <div className="space-y-0.5">
                <Label
                  htmlFor="must_change"
                  className="text-xs font-medium cursor-pointer"
                >
                  Require Password Change
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  On employee first login
                </p>
              </div>
              <Controller
                name="must_change_on_first_use"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="must_change"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Internal Security Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="e.g. 2FA enrolled via company YubiKey #4..."
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addMutation.isPending || updateMutation.isPending}
            >
              {addMutation.isPending || updateMutation.isPending
                ? "Encrypting..."
                : isEditing
                  ? "Update Details"
                  : "Save & Encrypt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
