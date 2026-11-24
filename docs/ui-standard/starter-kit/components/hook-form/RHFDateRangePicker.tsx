import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { DateRangePicker } from "../ui/date-picker";

export function RHFDateRangePicker({
  name,
  label,
  helperText,
  required,
}: {
  name: string;
  label?: string;
  helperText?: string;
  required?: boolean;
}) {
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
          <DateRangePicker
            id={name}
            value={field.value ?? { from: "", to: "" }}
            onChange={field.onChange}
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
