import { cn } from "@/lib/utils";

interface SelectChipProps {
  value: string | number;
  label: string;
  onRemove: () => void;
  disabled?: boolean;
  tone?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
}

export function SelectChip({
  value,
  label,
  onRemove,
  disabled = false,
  tone,
}: SelectChipProps) {
  const toneClasses = {
    default: "bg-primary/20 text-primary",
    primary: "bg-primary/20 text-primary",
    secondary: "bg-secondary text-secondary-foreground",
    success: "bg-success/20 text-success",
    warning: "bg-warning/20 text-warning",
    danger: "bg-danger/20 text-danger",
  };
  return (
    <span
      key={value}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs",
        toneClasses[tone ?? "default"],
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="ml-1 text-primary hover/40"
        >
          ×
        </button>
      )}
    </span>
  );
}
