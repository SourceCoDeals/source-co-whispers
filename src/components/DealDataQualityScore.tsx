import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DealDataQualityScoreProps {
  deal: {
    revenue?: number | null;
    geography?: string[] | null;
    service_mix?: string | null;
    ebitda_percentage?: number | null;
    ebitda_amount?: number | null;
    location_count?: number | null;
    headquarters?: string | null;
    industry_kpis?: Record<string, any> | null;
    company_overview?: string | null;
    owner_goals?: string | null;
    business_model?: string | null;
    end_market_customers?: string | null;
  };
  variant?: "compact" | "detailed";
}

interface FieldCheck {
  name: string;
  label: string;
  weight: number; // 2 = critical, 1 = important, 0.5 = bonus
  category: "critical" | "important" | "bonus";
  filled: boolean;
}

export function DealDataQualityScore({ deal, variant = "compact" }: DealDataQualityScoreProps) {
  const fieldChecks = useMemo<FieldCheck[]>(() => {
    const hasValue = (val: any): boolean => {
      if (val === null || val === undefined) return false;
      if (typeof val === "string") return val.trim().length > 0;
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === "object") return Object.keys(val).length > 0;
      return true;
    };

    return [
      // Critical fields (weight 2)
      { name: "revenue", label: "Revenue", weight: 2, category: "critical" as const, filled: hasValue(deal.revenue) },
      { name: "geography", label: "Geography", weight: 2, category: "critical" as const, filled: hasValue(deal.geography) },
      { name: "service_mix", label: "Service Mix", weight: 2, category: "critical" as const, filled: hasValue(deal.service_mix) },
      
      // Important fields (weight 1)
      { name: "ebitda", label: "EBITDA", weight: 1, category: "important" as const, filled: hasValue(deal.ebitda_percentage) || hasValue(deal.ebitda_amount) },
      { name: "location_count", label: "Locations", weight: 1, category: "important" as const, filled: hasValue(deal.location_count) },
      { name: "headquarters", label: "HQ Location", weight: 1, category: "important" as const, filled: hasValue(deal.headquarters) },
      { name: "business_model", label: "Business Model", weight: 1, category: "important" as const, filled: hasValue(deal.business_model) },
      
      // Bonus fields (weight 0.5)
      { name: "industry_kpis", label: "Industry KPIs", weight: 0.5, category: "bonus" as const, filled: hasValue(deal.industry_kpis) },
      { name: "company_overview", label: "Overview", weight: 0.5, category: "bonus" as const, filled: (deal.company_overview?.length || 0) > 50 },
      { name: "owner_goals", label: "Owner Goals", weight: 0.5, category: "bonus" as const, filled: hasValue(deal.owner_goals) },
      { name: "end_market_customers", label: "Customers", weight: 0.5, category: "bonus" as const, filled: hasValue(deal.end_market_customers) },
    ];
  }, [deal]);

  const { score, filledCount, totalCount, missingCritical, missingImportant } = useMemo(() => {
    const totalWeight = fieldChecks.reduce((sum, f) => sum + f.weight, 0);
    const filledWeight = fieldChecks.filter(f => f.filled).reduce((sum, f) => sum + f.weight, 0);
    const score = Math.round((filledWeight / totalWeight) * 100);
    const filledCount = fieldChecks.filter(f => f.filled).length;
    const totalCount = fieldChecks.length;
    const missingCritical = fieldChecks.filter(f => f.category === "critical" && !f.filled);
    const missingImportant = fieldChecks.filter(f => f.category === "important" && !f.filled);
    
    return { score, filledCount, totalCount, missingCritical, missingImportant };
  }, [fieldChecks]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-500";
    if (score >= 50) return "text-amber-600 dark:text-amber-500";
    return "text-red-600 dark:text-red-500";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const getBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 50) return "secondary";
    return "destructive";
  };

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={getBadgeVariant(score)} className="gap-1 cursor-help">
              {score >= 80 ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : score >= 50 ? (
                <Info className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              {score}% Data
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">Deal Data Quality: {score}%</p>
              <p className="text-xs text-muted-foreground">{filledCount} of {totalCount} fields filled</p>
              {missingCritical.length > 0 && (
                <div className="text-xs">
                  <span className="text-red-500 font-medium">Missing critical:</span>{" "}
                  {missingCritical.map(f => f.label).join(", ")}
                </div>
              )}
              {missingImportant.length > 0 && (
                <div className="text-xs">
                  <span className="text-amber-500 font-medium">Missing:</span>{" "}
                  {missingImportant.map(f => f.label).join(", ")}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Detailed variant
  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {score >= 80 ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : score >= 50 ? (
            <Info className="w-5 h-5 text-amber-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <span className="font-medium">Data Quality Score</span>
        </div>
        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}%</span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{filledCount} of {totalCount} fields</span>
          <span>{score >= 80 ? "Good" : score >= 50 ? "Fair" : "Incomplete"}</span>
        </div>
        <div className="relative">
          <Progress value={score} className="h-2" />
          <div 
            className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {(missingCritical.length > 0 || missingImportant.length > 0) && (
        <div className="space-y-2 pt-2 border-t">
          {missingCritical.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium text-red-600 dark:text-red-500">Critical missing:</span>{" "}
                <span className="text-muted-foreground">{missingCritical.map(f => f.label).join(", ")}</span>
              </div>
            </div>
          )}
          {missingImportant.length > 0 && (
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium text-amber-600 dark:text-amber-500">Recommended:</span>{" "}
                <span className="text-muted-foreground">{missingImportant.map(f => f.label).join(", ")}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
