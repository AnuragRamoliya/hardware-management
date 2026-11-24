import React, {
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Checkbox } from "../ui/Checkbox";
import { Switch } from "../ui/Switch";

interface FieldWrapperProps {
  name: string;
  label?: string;
  helperText?: string;
  required?: boolean;
}

export function RHFTextField({
  name,
  label,
  helperText,
  required,
  ...props
}: FieldWrapperProps & InputHTMLAttributes<HTMLInputElement>) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className="space-y-1.5">
          {label && (
            <label
              htmlFor={name}
              className="text-sm font-medium text-foreground"
            >
              {label} {required && <span className="text-destructive">*</span>}
            </label>
          )}
          <Input
            id={name}
            {...field}
            value={field.value ?? ""}
            aria-invalid={!!error}
            aria-describedby={error ? `${name}-error` : undefined}
            {...props}
          />
          {error ? (
            <p id={`${name}-error`} className="text-xs text-destructive">
              {error.message}
            </p>
          ) : helperText ? (
            <p className="text-xs text-muted-foreground">{helperText}</p>
          ) : null}
        </div>
      )}
    />
  );
}

export function RHFTextarea({
  name,
  label,
  helperText,
  required,
  ...props
}: FieldWrapperProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className="space-y-1.5">
          {label && (
            <label
              htmlFor={name}
              className="text-sm font-medium text-foreground"
            >
              {label} {required && <span className="text-destructive">*</span>}
            </label>
          )}
          <Textarea
            id={name}
            {...field}
            value={field.value ?? ""}
            aria-invalid={!!error}
            {...props}
          />
          {error ? (
            <p className="text-xs text-destructive">{error.message}</p>
          ) : helperText ? (
            <p className="text-xs text-muted-foreground">{helperText}</p>
          ) : null}
        </div>
      )}
    />
  );
}

export function RHFCheckbox({ name, label, helperText }: FieldWrapperProps) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className="flex items-start gap-2">
          <Checkbox
            id={name}
            checked={!!field.value}
            onChange={(e) => field.onChange(e.target.checked)}
          />
          <div className="space-y-1">
            {label && (
              <label
                htmlFor={name}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {label}
              </label>
            )}
            {error ? (
              <p className="text-xs text-destructive">{error.message}</p>
            ) : helperText ? (
              <p className="text-xs text-muted-foreground">{helperText}</p>
            ) : null}
          </div>
        </div>
      )}
    />
  );
}

export function RHFSwitch({ name, label, helperText }: FieldWrapperProps) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="space-y-0.5">
            {label && <span className="text-sm font-medium">{label}</span>}
            {helperText && (
              <p className="text-xs text-muted-foreground">{helperText}</p>
            )}
          </div>
          <Switch checked={!!field.value} onCheckedChange={field.onChange} />
        </div>
      )}
    />
  );
}
