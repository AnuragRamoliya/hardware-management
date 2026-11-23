import { Controller, useFormContext } from "react-hook-form";
import { TimePicker, type TimePickerProps } from "@/components/ui/date-picker";

export interface RHFTimePickerProps extends Omit<
  TimePickerProps,
  "value" | "onChange"
> {
  name: string;
  label: string;
  helperText?: string;
  required?: boolean;
}

export function RHFTimePicker({
  name,
  label,
  helperText,
  required = false,
  className,
  ...props
}: RHFTimePickerProps) {
  const { control } = useFormContext();

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="text-[13px] font-medium text-foreground flex items-center gap-1"
      >
        <span>{label}</span>
        {required && <span className="text-danger">*</span>}
      </label>

      <Controller
        control={control}
        name={name}
        defaultValue=""
        render={({ field, fieldState }) => (
          <TimePicker
            id={name}
            name={name}
            value={field.value}
            onChange={(val) => field.onChange(val)}
            className={
              fieldState.error
                ? "border-danger focus-visible:ring-danger"
                : className
            }
            {...props}
          />
        )}
      />

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
