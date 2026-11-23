import { Controller, useFormContext } from "react-hook-form";
import { PhoneField } from "@/components/ui/phone-field";
import type { CountryCode } from "libphonenumber-js";
import { AlertCircle } from "lucide-react";

export interface RHFPhoneFieldProps {
  name: string;
  label: string;
  helperText?: string;
  required?: boolean;
  defaultCountry?: CountryCode;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function RHFPhoneField({
  name,
  label,
  helperText,
  required = false,
  defaultCountry = "IN",
  disabled = false,
  placeholder,
  className,
}: RHFPhoneFieldProps) {
  const { control, formState } = useFormContext();
  const error = formState.errors[name];

  return (
    <div className="min-w-0 space-y-1.5" data-hm="phone">
      <label htmlFor={name} className="block text-[13px] font-medium">
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <Controller
        name={name}
        control={control}
        rules={{ required: required ? `${label} is required` : false }}
        render={({ field }) => (
          <PhoneField
            id={name}
            name={name}
            value={field.value || ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            defaultCountry={defaultCountry}
            disabled={disabled}
            placeholder={placeholder}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${name}-error` : undefined}
            className={className}
          />
        )}
      />
      {error ? (
        <p
          id={`${name}-error`}
          aria-live="polite"
          className="flex items-center gap-1 text-xs text-danger"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {error.message?.toString() || "Invalid phone number"}
        </p>
      ) : helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
