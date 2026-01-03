import { ArrowRight } from "lucide-react";
import { PipelineStage } from "@/hooks/useDashboardMetrics";
import { cn } from "@/lib/utils";

interface PipelineFunnelProps {
  stages: PipelineStage[];
  className?: string;
}

export function PipelineFunnel({ stages, className }: PipelineFunnelProps) {
  if (stages.length === 0) {
    return (
      <div className={cn("bg-card rounded-lg border p-6", className)}>
        <p className="text-muted-foreground text-center">No pipeline data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...stages.map(s => s.value), 1);

  return (
    <div className={cn("bg-card rounded-lg border p-6", className)}>
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Buyer-Deal Pipeline</h3>
      
      <div className="flex items-center justify-between gap-2">
        {stages.map((stage, index) => {
          const widthPercent = Math.max((stage.value / maxValue) * 100, 20);
          const conversionRate = index > 0 && stages[index - 1].value > 0
            ? Math.round((stage.value / stages[index - 1].value) * 100)
            : null;

          return (
            <div key={stage.name} className="flex items-center flex-1">
              <div className="flex-1">
                {/* Conversion rate from previous stage */}
                {conversionRate !== null && (
                  <div className="text-xs text-muted-foreground text-center mb-1">
                    {conversionRate}%
                  </div>
                )}
                
                {/* Stage bar */}
                <div 
                  className="relative rounded-md transition-all duration-500 ease-out"
                  style={{ 
                    height: `${Math.max(widthPercent * 0.8, 40)}px`,
                    backgroundColor: stage.color,
                  }}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <span className="text-2xl font-bold">{stage.value}</span>
                  </div>
                </div>
                
                {/* Stage label */}
                <p className="text-xs text-center mt-2 text-muted-foreground font-medium">
                  {stage.name}
                </p>
              </div>

              {/* Arrow between stages */}
              {index < stages.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground/40 mx-1 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
