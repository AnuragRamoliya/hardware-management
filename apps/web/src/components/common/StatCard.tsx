import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  change,
  icon,
}: {
  label: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="rounded-lg bg-accent p-2 text-primary">{icon}</span>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <span className="text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </span>
        {change !== undefined && (
          <span
            className={`flex items-center text-xs font-medium ${change < 0 ? "text-danger" : "text-success"}`}
          >
            {change < 0 ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpRight className="h-3.5 w-3.5" />
            )}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        compared with last month
      </p>
    </Card>
  );
}
