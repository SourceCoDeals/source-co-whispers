import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ScoreDistributionBucket } from "@/hooks/useDashboardMetrics";
import { cn } from "@/lib/utils";

interface ScoreDistributionProps {
  data: ScoreDistributionBucket[];
  className?: string;
}

export function ScoreDistribution({ data, className }: ScoreDistributionProps) {
  const hasData = data.some(d => d.count > 0);

  if (!hasData) {
    return (
      <div className={cn("bg-card rounded-lg border p-6 h-[200px] flex items-center justify-center", className)}>
        <p className="text-muted-foreground text-sm">No score data available</p>
      </div>
    );
  }

  return (
    <div className={cn("bg-card rounded-lg border p-6", className)}>
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Score Distribution</h3>
      
      <div className="h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="range" 
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [value, "Buyers"]}
              labelFormatter={(label) => `Score: ${label}`}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Weak</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <span className="text-muted-foreground">Moderate</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-muted-foreground">Strong</span>
        </div>
      </div>
    </div>
  );
}
