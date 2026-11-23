import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Table as TableIcon } from "lucide-react";

const CHART_COLORS = [
  "#2563EB", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#EC4899", // Pink
  "#64748B", // Slate
];

export interface ChartDataItem {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface ChartProps {
  title: string;
  description?: string;
  data: ChartDataItem[];
  type?: "bar" | "pie";
  dataKey?: string;
  categoryKey?: string;
  height?: number;
  className?: string;
  barColor?: string;
}

export function Chart({
  title,
  description,
  data,
  type = "bar",
  dataKey = "value",
  categoryKey = "name",
  height = 300,
  className = "",
  barColor = "#2563EB",
}: ChartProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <Card className={`p-5 flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground tracking-tight">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTable(!showTable)}
          className="h-8 px-2.5 text-xs flex items-center gap-1.5"
          aria-label={
            showTable ? `View ${title} as Chart` : `View ${title} as Data Table`
          }
        >
          {showTable ? (
            <>
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Chart</span>
            </>
          ) : (
            <>
              <TableIcon className="h-3.5 w-3.5" />
              <span>Table</span>
            </>
          )}
        </Button>
      </div>

      <div
        style={{ minHeight: height }}
        className="w-full flex items-center justify-center"
      >
        {data.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            No chart data available
          </div>
        ) : showTable ? (
          <div className="w-full overflow-auto max-h-[300px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="py-2 px-3 capitalize">{categoryKey}</th>
                  <th className="py-2 px-3 text-right capitalize">{dataKey}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border/40 hover:bg-muted/30"
                  >
                    <td className="py-2 px-3 font-normal">
                      {item[categoryKey]}
                    </td>
                    <td className="py-2 px-3 text-right font-medium tabular-nums">
                      {typeof item[dataKey] === "number"
                        ? (item[dataKey] as number).toLocaleString()
                        : item[dataKey]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : type === "pie" ? (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart role="img" aria-label={title}>
              <title>{title}</title>
              <desc>{description || title}</desc>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              />
              <Pie
                data={data}
                dataKey={dataKey}
                nameKey={categoryKey}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
              >
                {data.map((item, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    aria-label={`${item[categoryKey]}: ${item[dataKey]}`}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              role="img"
              aria-label={title}
              data={data}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <title>{title}</title>
              <desc>{description || title}</desc>
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.2}
                vertical={false}
              />
              <XAxis
                dataKey={categoryKey}
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey={dataKey} fill={barColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
