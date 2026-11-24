import React from "react";
import { Filter, X } from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

export interface FilterChip {
  id: string;
  label: string;
  value: string;
}

export function TableFilterPanel({
  activeFilters = [],
  onRemoveFilter,
  onClearAll,
}: {
  activeFilters?: FilterChip[];
  onRemoveFilter?: (id: string) => void;
  onClearAll?: () => void;
}) {
  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Filter className="h-3 w-3" /> Filters:
      </span>
      {activeFilters.map((f) => (
        <Badge key={f.id} variant="outline" className="gap-1 pl-2 pr-1 py-0.5">
          <span>
            {f.label}: <strong>{f.value}</strong>
          </span>
          {onRemoveFilter && (
            <button
              onClick={() => onRemoveFilter(f.id)}
              className="hover:bg-muted rounded-full p-0.5"
              aria-label={`Remove ${f.label} filter`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      {onClearAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 text-xs px-2"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
