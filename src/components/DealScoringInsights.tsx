import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Brain, RefreshCw, RotateCcw, TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface DealScoringInsightsProps {
  dealId: string;
  onRecalculate?: () => void;
}

interface ScoringAdjustments {
  geography_weight_mult: number;
  size_weight_mult: number;
  services_weight_mult: number;
  approved_count: number;
  rejected_count: number;
  passed_geography: number;
  passed_size: number;
  passed_services: number;
  last_calculated_at: string | null;
}

export function DealScoringInsights({ dealId, onRecalculate }: DealScoringInsightsProps) {
  const [adjustments, setAdjustments] = useState<ScoringAdjustments | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadAdjustments();
  }, [dealId]);

  const loadAdjustments = async () => {
    const { data, error } = await supabase
      .from("deal_scoring_adjustments")
      .select("*")
      .eq("deal_id", dealId)
      .maybeSingle();

    if (!error && data) {
      setAdjustments(data as ScoringAdjustments);
    } else {
      setAdjustments(null);
    }
    setIsLoading(false);
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('recalculate-deal-weights', {
        body: { dealId, action: 'manual' }
      });
      
      if (error) {
        console.error("Recalculation error:", error);
      } else {
        await loadAdjustments();
        onRecalculate?.();
      }
    } catch (err) {
      console.error("Failed to recalculate:", err);
    }
    setIsRecalculating(false);
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await supabase
        .from("deal_scoring_adjustments")
        .delete()
        .eq("deal_id", dealId);
      
      setAdjustments(null);
      onRecalculate?.();
    } catch (err) {
      console.error("Failed to reset:", err);
    }
    setIsResetting(false);
  };

  const getWeightTrend = (mult: number) => {
    if (mult > 1.05) return { icon: TrendingUp, label: "Increased", color: "text-amber-500" };
    if (mult < 0.95) return { icon: TrendingDown, label: "Decreased", color: "text-blue-500" };
    return { icon: Minus, label: "Normal", color: "text-muted-foreground" };
  };

  const totalDecisions = adjustments 
    ? adjustments.approved_count + adjustments.passed_geography + adjustments.passed_size + adjustments.passed_services
    : 0;

  const hasAdjustments = adjustments && (
    adjustments.geography_weight_mult !== 1.0 ||
    adjustments.size_weight_mult !== 1.0 ||
    adjustments.services_weight_mult !== 1.0
  );

  if (isLoading) {
    return null;
  }

  // Compact badge when no adjustments or closed
  if (!hasAdjustments && !isOpen) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs gap-1 cursor-pointer hover:bg-muted/50" onClick={() => setIsOpen(true)}>
          <Brain className="w-3 h-3" />
          Score Learning
          {totalDecisions > 0 && (
            <span className="text-muted-foreground ml-1">({totalDecisions} decisions)</span>
          )}
        </Badge>
        {totalDecisions >= 2 && !hasAdjustments && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={handleRecalculate}
            disabled={isRecalculating}
          >
            {isRecalculating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card/50">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Scoring Insights</span>
              {hasAdjustments && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  Weights Adjusted
                </Badge>
              )}
              {totalDecisions > 0 && (
                <span className="text-xs text-muted-foreground">
                  Based on {totalDecisions} decision{totalDecisions !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 border-t">
            {adjustments ? (
              <>
                {/* Weight adjustments */}
                <div className="pt-3 space-y-2">
                  <WeightRow 
                    label="Geography" 
                    multiplier={adjustments.geography_weight_mult} 
                    passedCount={adjustments.passed_geography}
                  />
                  <WeightRow 
                    label="Size" 
                    multiplier={adjustments.size_weight_mult} 
                    passedCount={adjustments.passed_size}
                  />
                  <WeightRow 
                    label="Services" 
                    multiplier={adjustments.services_weight_mult} 
                    passedCount={adjustments.passed_services}
                  />
                </div>

                {/* Stats summary */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {adjustments.approved_count} approved
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {adjustments.passed_geography + adjustments.passed_size + adjustments.passed_services} passed
                  </span>
                  {adjustments.rejected_count > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-destructive" />
                      {adjustments.rejected_count} removed
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={handleRecalculate}
                    disabled={isRecalculating}
                  >
                    {isRecalculating ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    Recalculate
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs text-muted-foreground"
                    onClick={handleReset}
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3 mr-1" />
                    )}
                    Reset
                  </Button>
                </div>
              </>
            ) : (
              <div className="pt-3 text-sm text-muted-foreground">
                <p>No weight adjustments yet. Approve or pass on buyers to help the system learn what matters for this deal.</p>
                {totalDecisions >= 2 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 h-7 text-xs"
                    onClick={handleRecalculate}
                    disabled={isRecalculating}
                  >
                    {isRecalculating ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    Calculate from decisions
                  </Button>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function WeightRow({ label, multiplier, passedCount }: { label: string; multiplier: number; passedCount: number }) {
  const percentage = Math.round(multiplier * 100);
  const isIncreased = multiplier > 1.05;
  const isDecreased = multiplier < 0.95;
  
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-20 text-muted-foreground">{label}</span>
      <div className="flex-1">
        <Progress 
          value={percentage} 
          className={cn(
            "h-2",
            isIncreased && "[&>div]:bg-amber-500",
            isDecreased && "[&>div]:bg-blue-500"
          )} 
        />
      </div>
      <div className="flex items-center gap-1.5 w-24 justify-end">
        <span className={cn(
          "text-xs font-medium",
          isIncreased && "text-amber-500",
          isDecreased && "text-blue-500"
        )}>
          {percentage}%
        </span>
        {isIncreased && (
          <Tooltip>
            <TooltipTrigger>
              <TrendingUp className="w-3 h-3 text-amber-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{passedCount} buyers passed due to {label.toLowerCase()}</p>
            </TooltipContent>
          </Tooltip>
        )}
        {isDecreased && (
          <Tooltip>
            <TooltipTrigger>
              <TrendingDown className="w-3 h-3 text-blue-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Approved buyers had lower {label.toLowerCase()} scores</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
