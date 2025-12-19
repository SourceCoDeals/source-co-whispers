import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, HelpCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ConfidenceLevel = "high" | "medium" | "low" | null | undefined;

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  isInferred?: boolean;
  sourceQuote?: string;
  className?: string;
}

export function ConfidenceBadge({
  confidence,
  isInferred = false,
  sourceQuote,
  className,
}: ConfidenceBadgeProps) {
  if (!confidence) return null;

  const config = {
    high: {
      label: "High Confidence",
      icon: CheckCircle2,
      variant: "default" as const,
      description: "Revenue and margin clearly stated or profit is explicitly pre-tax and pre-debt",
    },
    medium: {
      label: "Medium Confidence",
      icon: Info,
      variant: "secondary" as const,
      description: "Owner income or cash flow discussed without full clarity",
    },
    low: {
      label: "Low Confidence",
      icon: AlertTriangle,
      variant: "destructive" as const,
      description: "Statements are ambiguous or partially personal - requires follow-up",
    },
  };

  const { label, icon: Icon, variant, description } = config[confidence];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1.5", className)}>
            <Badge variant={variant} className="gap-1 text-xs cursor-help">
              <Icon className="w-3 h-3" />
              {label}
            </Badge>
            {isInferred && (
              <Badge variant="outline" className="text-xs">
                Inferred
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs space-y-2">
          <p className="text-sm font-medium">{description}</p>
          {sourceQuote && (
            <div className="border-l-2 border-primary pl-2 text-xs text-muted-foreground italic">
              "{sourceQuote}"
            </div>
          )}
          {isInferred && (
            <p className="text-xs text-muted-foreground">
              This value was calculated from other data in the transcript, not stated directly.
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
