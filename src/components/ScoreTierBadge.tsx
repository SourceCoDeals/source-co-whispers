import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Minus, TrendingDown, XCircle, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScoreTierBadgeProps {
  score: number;
  isDisqualified?: boolean;
  showScore?: boolean;
  size?: "sm" | "md";
  className?: string;
}

type TierConfig = {
  label: string;
  icon: typeof Star;
  bgColor: string;
  description: string;
};

function getTierConfig(score: number, isDisqualified: boolean): TierConfig {
  if (isDisqualified) {
    return {
      label: "Not Eligible",
      icon: XCircle,
      bgColor: "bg-muted text-muted-foreground border-muted-foreground/30",
      description: "Buyer does not meet minimum criteria for this deal",
    };
  }

  if (score >= 85) {
    return {
      label: "Excellent",
      icon: Star,
      bgColor: "bg-green-600/15 text-green-700 dark:text-green-400 border-green-600/30",
      description: "Exceptional fit across all criteria - prioritize outreach",
    };
  }

  if (score >= 70) {
    return {
      label: "Strong",
      icon: TrendingUp,
      bgColor: "bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/30",
      description: "Good alignment on key criteria - strong candidate",
    };
  }

  if (score >= 55) {
    return {
      label: "Moderate",
      icon: Minus,
      bgColor: "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/30",
      description: "Partial alignment - may be worth exploring",
    };
  }

  if (score >= 40) {
    return {
      label: "Weak",
      icon: TrendingDown,
      bgColor: "bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-500/30",
      description: "Limited alignment - lower priority unless specific reasons",
    };
  }

  return {
    label: "Poor",
    icon: AlertTriangle,
    bgColor: "bg-destructive/10 text-destructive border-destructive/30",
    description: "Significant misalignment on critical criteria",
  };
}

export function ScoreTierBadge({
  score,
  isDisqualified = false,
  showScore = true,
  size = "md",
  className,
}: ScoreTierBadgeProps) {
  const { label, icon: Icon, bgColor, description } = getTierConfig(score, isDisqualified);

  const sizeClasses = size === "sm" 
    ? "text-[10px] h-5 px-1.5 gap-0.5" 
    : "text-xs h-6 px-2 gap-1";

  const iconSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn("cursor-help font-medium", bgColor, sizeClasses, className)}
          >
            <Icon className={iconSize} />
            <span>{label}</span>
            {showScore && !isDisqualified && (
              <span className="opacity-70 ml-0.5">{score}</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{description}</p>
          {!isDisqualified && (
            <p className="text-xs text-muted-foreground mt-1">
              Score: {score}/100
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
