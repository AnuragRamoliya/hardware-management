import { useState } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-base",
};

export function Avatar({ name, src, size = "md" }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-label={name}
      role="img"
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent font-semibold text-accent-foreground",
        sizes[size],
      )}
    >
      {src && !imageFailed ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initials || "?"
      )}
    </span>
  );
}

export function AvatarGroup({
  people,
  max = 4,
}: {
  people: Array<{ name: string; src?: string }>;
  max?: number;
}) {
  const visible = people.slice(0, max);
  return (
    <div
      aria-label={`${people.length} people`}
      className="flex items-center -space-x-2"
    >
      {visible.map((person) => (
        <Avatar
          key={person.name}
          name={person.name}
          src={person.src}
          size="sm"
        />
      ))}
      {people.length > max && (
        <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
          +{people.length - max}
        </span>
      )}
    </div>
  );
}
