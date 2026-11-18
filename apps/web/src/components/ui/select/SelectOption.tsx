import { cn } from "@/lib/utils";

interface SelectOptionProps {
  option: {
    value: string | number;
    label: string;
    subLabel?: string;
    disabled?: boolean;
    badge?: { text: string; tone: string };
    avatar?: string;
  };
  isSelected: boolean;
  onSelect: (value: string | number) => void;
}

export function SelectOption({
  option,
  isSelected,
  onSelect,
}: SelectOptionProps) {
  return (
    <div
      role="option"
      tabIndex={isSelected ? 0 : -1}
      onClick={() => onSelect(option.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(option.value);
        }
      }}
      className={cn(
        "flex items-start gap-3 py-2 cursor-pointer select-none hover:bg-muted/50",
        isSelected && "bg-primary/5 text-primary",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:ring-2",
      )}
    >
      <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-md flex items-center justify-center">
        {option.label ? (
          <span className="font-medium text-primary">{option.label[0]}</span>
        ) : (
          <span className="text-muted-foreground">?</span>
        )}
      </span>
      <div className="flex-1 min-w-0">
        <span className="font-medium truncate">{option.label}</span>
        {option.subLabel && (
          <span className="mt-0.5 block text-sm text-muted-foreground truncate">
            {option.subLabel}
          </span>
        )}
      </div>
      {option.badge && (
        <span className="inline-flex items-center gap-1 text-xs font-medium bg-muted/10 rounded">
          {option.badge.text}
        </span>
      )}
      {option.disabled && (
        <span className="ml-2 text-muted-foreground opacity-50 cursor-not-allowed">
          ×
        </span>
      )}
    </div>
  );
}
