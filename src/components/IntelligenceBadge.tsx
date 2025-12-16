import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Brain, CircleDot } from "lucide-react";
import type { Buyer, IntelligenceCoverage } from "@/lib/types";
import { getIntelligenceCoverage, calculateIntelligencePercentage } from "@/lib/types";

interface IntelligenceBadgeProps {
  buyer: Buyer;
  showPercentage?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function IntelligenceBadge({ buyer, showPercentage = false, size = "md", className }: IntelligenceBadgeProps) {
  const coverage = getIntelligenceCoverage(buyer);
  const percentage = calculateIntelligencePercentage(buyer);
  
  const variants: Record<IntelligenceCoverage, "intelligence-high" | "intelligence-medium" | "intelligence-low"> = {
    high: "intelligence-high",
    medium: "intelligence-medium",
    low: "intelligence-low",
  };

  const labels = {
    high: "High Intelligence",
    medium: "Medium Intelligence",
    low: "No Intelligence",
  };

  const icons = {
    high: "🟢",
    medium: "🟡",
    low: "⚪",
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-0.5",
  };

  return (
    <Badge 
      variant={variants[coverage]} 
      className={cn("gap-1", sizeClasses[size], className)}
    >
      <span>{icons[coverage]}</span>
      {showPercentage ? `${percentage}%` : labels[coverage]}
    </Badge>
  );
}

interface IntelligenceIndicatorProps {
  coverage: IntelligenceCoverage;
  className?: string;
}

export function IntelligenceIndicator({ coverage, className }: IntelligenceIndicatorProps) {
  const colors = {
    high: "bg-emerald-500",
    medium: "bg-amber-500",
    low: "bg-slate-300 dark:bg-slate-600",
  };

  return (
    <div className={cn("w-2.5 h-2.5 rounded-full", colors[coverage], className)} />
  );
}

interface IntelligenceCoverageBarProps {
  intelligentCount: number;
  totalCount: number;
  className?: string;
}

export function IntelligenceCoverageBar({ intelligentCount, totalCount, className }: IntelligenceCoverageBarProps) {
  const percentage = totalCount > 0 ? Math.round((intelligentCount / totalCount) * 100) : 0;
  
  let colorClass = "bg-slate-400";
  if (percentage >= 75) colorClass = "bg-emerald-500";
  else if (percentage >= 50) colorClass = "bg-amber-500";
  else if (percentage > 0) colorClass = "bg-red-400";

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Intelligence Coverage</span>
        <span className="font-medium">{intelligentCount} of {totalCount} buyers</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {percentage}% intelligent
      </p>
    </div>
  );
}
