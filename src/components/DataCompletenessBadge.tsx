import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, HelpCircle, Database } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CompletenessLevel = "High" | "Medium" | "Low" | "high" | "medium" | "low" | null | undefined;

interface DataCompletenessBadgeProps {
  completeness: CompletenessLevel;
  missingFields?: string[];
  className?: string;
  showLabel?: boolean;
}

const normalizeLevel = (level: CompletenessLevel): "high" | "medium" | "low" | null => {
  if (!level) return null;
  return level.toLowerCase() as "high" | "medium" | "low";
};

export function DataCompletenessBadge({
  completeness,
  missingFields = [],
  className,
  showLabel = false,
}: DataCompletenessBadgeProps) {
  const normalized = normalizeLevel(completeness);
  if (!normalized) return null;

  const config = {
    high: {
      label: "Complete Data",
      shortLabel: "Complete",
      icon: CheckCircle2,
      variant: "default" as const,
      bgColor: "bg-green-500/10 text-green-600 border-green-500/30",
      description: "Buyer profile has sufficient data for confident scoring",
    },
    medium: {
      label: "Partial Data",
      shortLabel: "Partial",
      icon: HelpCircle,
      variant: "secondary" as const,
      bgColor: "bg-amber-500/10 text-amber-600 border-amber-500/30",
      description: "Some buyer data is missing; score may be less reliable",
    },
    low: {
      label: "Limited Data",
      shortLabel: "Limited",
      icon: AlertTriangle,
      variant: "destructive" as const,
      bgColor: "bg-destructive/10 text-destructive border-destructive/30",
      description: "Critical buyer data is missing; score confidence is low",
    },
  };

  const { label, shortLabel, icon: Icon, bgColor, description } = config[normalized];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn("gap-1 text-[10px] cursor-help h-5", bgColor, className)}
          >
            <Database className="w-2.5 h-2.5" />
            {showLabel && <span>{shortLabel}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs space-y-2">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <p className="text-sm font-medium">{label}</p>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
          {missingFields.length > 0 && (
            <div className="pt-1 border-t">
              <p className="text-xs font-medium mb-1">Missing data:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {missingFields.slice(0, 5).map((field, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                    {field}
                  </li>
                ))}
                {missingFields.length > 5 && (
                  <li className="text-muted-foreground/70">+{missingFields.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
