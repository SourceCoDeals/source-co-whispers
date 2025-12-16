import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getMatchQuality } from "@/lib/types";

interface ScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ScoreBadge({ score, showLabel = false, size = "md", className }: ScoreBadgeProps) {
  const quality = getMatchQuality(score);
  
  const labels = {
    high: "Strong Fit",
    medium: "Moderate Fit",
    low: "Long Shot",
  };

  const variants = {
    high: "match-high" as const,
    medium: "match-medium" as const,
    low: "match-low" as const,
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1",
  };

  return (
    <Badge 
      variant={variants[quality]} 
      className={cn(sizeClasses[size], className)}
    >
      {Math.round(score)}%{showLabel && ` · ${labels[quality]}`}
    </Badge>
  );
}

interface ScoreBreakdownProps {
  scores: {
    geography: number | null;
    service: number | null;
    acquisition: number | null;
    portfolio: number | null;
    businessModel: number | null;
    thesisBonus: number;
  };
  className?: string;
}

export function ScoreBreakdown({ scores, className }: ScoreBreakdownProps) {
  const items = [
    { label: "Geography", value: scores.geography, max: 100 },
    { label: "Service", value: scores.service, max: 100 },
    { label: "Acquisition Activity", value: scores.acquisition, max: 100 },
    { label: "Portfolio Fit", value: scores.portfolio, max: 100 },
    { label: "Business Model", value: scores.businessModel, max: 100 },
    { label: "Intelligence Bonus", value: scores.thesisBonus, max: 50, isBonus: true },
  ];

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-32 flex-shrink-0">{item.label}</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                item.isBonus ? "bg-accent" : "bg-primary"
              )}
              style={{ width: `${((item.value ?? 0) / item.max) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium w-12 text-right">
            {item.value ?? 0}/{item.max}
          </span>
        </div>
      ))}
    </div>
  );
}
