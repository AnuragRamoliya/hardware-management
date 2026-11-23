import { useFormContext, useWatch } from "react-hook-form";
import {
  DateRangePicker,
  type DateRangePickerProps,
} from "@/components/ui/date-picker";

export interface RHFDateRangePickerProps extends Omit<
  DateRangePickerProps,
  "value" | "onChange"
> {
  fromName: string;
  toName: string;
  label: string;
  helperText?: string;
  required?: boolean;
}

export function RHFDateRangePicker({
  fromName,
  toName,
  label,
  helperText,
  required = false,
  ...props
}: RHFDateRangePickerProps) {
  const { control, setValue } = useFormContext();
  const fromValue = useWatch({ control, name: fromName });
  const toValue = useWatch({ control, name: toName });

  return (
    <fieldset className="space-y-1.5">
      <legend className="text-[13px] font-medium text-foreground flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-danger">*</span>}
      </legend>

      <DateRangePicker
        id={`${fromName}_${toName}`}
        value={{ from: fromValue || "", to: toValue || "" }}
        onChange={(range) => {
          setValue(fromName, range.from || "", {
            shouldDirty: true,
            shouldValidate: true,
          });
          setValue(toName, range.to || "", {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
        {...props}
      />

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </fieldset>
  );
}
