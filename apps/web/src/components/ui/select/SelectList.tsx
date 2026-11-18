import { cn } from "@/lib/utils";

interface SelectOptionVirtual {
  value: string | number;
  label: string;
  subLabel?: string;
  disabled?: boolean;
  badge?: { text: string; tone: string };
  avatar?: string;
}

interface SelectListProps {
  options: SelectOptionVirtual[];
  onSelect: (value: string | number) => void;
  isMulti: boolean;
  isLoading: boolean;
  error?: string;
  searchValue: string;
  className?: string;
  minHeight?: number;
}

export function SelectList({
  options,
  onSelect,
  isMulti,
  isLoading,
  error,
  searchValue,
  className,
  minHeight = 200,
}: SelectListProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col min-h-[200px] max-h-[300px] overflow-hidden",
        className,
      )}
      style={{ minHeight }}
    >
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-8 text-muted-foreground">
          <span className="animate-pulse h-4 w-4 mr-2" />
          Loading options…
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center py-8 text-danger">
          {error}
        </div>
      ) : options.length === 0 ? (
        <div
          className={cn(
            "flex-1 flex items-center justify-center py-8 text-muted-foreground",
          )}
        >
          <span />
          {" No results for "}
          <span className="font-medium">{searchValue || ""}</span>
        </div>
      ) : (
        <>
          {options.map((option) => {
            const isSelected = isMulti
              ? options.some((o) => o.value === option.value)
              : true;

            return (
              <div
                key={option.value}
                className={cn(
                  "flex items-start gap-2 rounded-md px-2 py-1.5 cursor-pointer select-none hover:bg-muted/50",
                  isSelected && "bg-primary/5 text-primary",
                )}
                onClick={() => onSelect(option.value)}
                role="option"
                tabIndex={isSelected ? 0 : -1}
              >
                <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-md flex items-center justify-center">
                  {option.label ? (
                    <span className="font-medium text-primary">
                      {option.label[0]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">?</span>
                  )}
                </span>
                {option.subLabel && (
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {option.subLabel}
                  </span>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
