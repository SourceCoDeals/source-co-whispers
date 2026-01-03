import { cn } from "@/lib/utils";
import { ConversionRates } from "@/hooks/useDashboardMetrics";
import { TrendingUp, Target, ThumbsUp, XCircle } from "lucide-react";

interface ConversionMetricsProps {
  conversions: ConversionRates;
  className?: string;
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  description: string;
}

function MetricCard({ label, value, icon: Icon, description }: MetricCardProps) {
  const getColorClass = (val: number) => {
    if (val >= 50) return "text-success bg-success/10";
    if (val >= 25) return "text-warning bg-warning/10";
    return "text-muted-foreground bg-muted";
  };

  const getProgressColor = (val: number) => {
    if (val >= 50) return "bg-success";
    if (val >= 25) return "bg-warning";
    return "bg-muted-foreground";
  };

  return (
    <div className="flex-1 p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("p-1.5 rounded-md", getColorClass(value))}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold">{value}%</span>
      </div>
      <div className="mt-2">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-500", getProgressColor(value))}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{description}</p>
    </div>
  );
}

export function ConversionMetrics({ conversions, className }: ConversionMetricsProps) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3", className)}>
      <MetricCard
        label="Match Rate"
        value={conversions.matchRate}
        icon={Target}
        description="Strong fit / All matches"
      />
      <MetricCard
        label="Approval Rate"
        value={conversions.approvalRate}
        icon={TrendingUp}
        description="Approved / Strong fit"
      />
      <MetricCard
        label="Interest Rate"
        value={conversions.interestRate}
        icon={ThumbsUp}
        description="Interested / Approved"
      />
      <MetricCard
        label="Pass Rate"
        value={conversions.passRate}
        icon={XCircle}
        description="Passed / Engaged"
      />
    </div>
  );
}
