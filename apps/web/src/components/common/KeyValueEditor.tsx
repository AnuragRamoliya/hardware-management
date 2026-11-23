import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type KeyValueEntry = { key: string; value: string };

export function KeyValueEditor({
  label = "Specifications",
  value,
  onChange,
  keyPlaceholder = "Property",
  valuePlaceholder = "Value",
}: {
  label?: string;
  value: KeyValueEntry[];
  onChange: (next: KeyValueEntry[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  const update = (index: number, field: keyof KeyValueEntry, next: string) =>
    onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: next } : item));
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium">{label}</legend>
      {value.map((item, index) => <div className="grid grid-cols-[1fr_1fr_auto] gap-2" key={`${index}-${item.key}`}>
        <Input aria-label={`${label} property ${index + 1}`} value={item.key} placeholder={keyPlaceholder} onChange={(event) => update(index, "key", event.target.value)} />
        <Input aria-label={`${label} value ${index + 1}`} value={item.value} placeholder={valuePlaceholder} onChange={(event) => update(index, "value", event.target.value)} />
        <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${label.toLowerCase()} row ${index + 1}`} onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
      </div>)}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { key: "", value: "" }])}><Plus className="h-4 w-4" />Add property</Button>
    </fieldset>
  );
}
