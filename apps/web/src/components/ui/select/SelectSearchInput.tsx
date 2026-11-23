import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "../input";
import { useDebounce } from "@/hooks/use-debounce";

interface SelectSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  debounceDelay?: number;
  disabled?: boolean;
}

export function SelectSearchInput({
  value,
  onChange,
  debounceDelay = 300,
  disabled = false,
}: SelectSearchInputProps) {
  const [draft, setDraft] = useState(value);
  const debounced = useDebounce(draft, debounceDelay);

  useEffect(() => {
    onChange(debounced);
  }, [debounced, onChange]);

  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
      />
      <Input
        placeholder="Type to search..."
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={disabled}
        className="pr-9 pl-10"
      />
    </div>
  );
}
