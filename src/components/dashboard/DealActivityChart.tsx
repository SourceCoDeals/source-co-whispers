import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TimeSeriesDataPoint } from "@/hooks/useDashboardMetrics";
import { cn } from "@/lib/utils";

interface DealActivityChartProps {
  data: TimeSeriesDataPoint[];
  className?: string;
}

export function DealActivityChart({ data, className }: DealActivityChartProps) {
  if (data.length === 0) {
    return (
      <div className={cn("bg-card rounded-lg border p-6 h-[300px] flex items-center justify-center", className)}>
        <p className="text-muted-foreground">No activity data available</p>
      </div>
    );
  }

  return (
    <div className={cn("bg-card rounded-lg border p-6", className)}>
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Activity Over Time</h3>
      
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorApprovals" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDeals" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="week" 
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend 
              wrapperStyle={{ fontSize: "12px" }}
              iconType="circle"
              iconSize={8}
            />
            <Area
              type="monotone"
              dataKey="matchesScored"
              name="Matches"
              stroke="hsl(var(--accent))"
              fillOpacity={1}
              fill="url(#colorMatches)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="approvals"
              name="Approvals"
              stroke="hsl(var(--success))"
              fillOpacity={1}
              fill="url(#colorApprovals)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="dealsCreated"
              name="New Deals"
              stroke="hsl(262, 83%, 58%)"
              fillOpacity={1}
              fill="url(#colorDeals)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
