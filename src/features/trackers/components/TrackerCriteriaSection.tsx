import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Wand2, Loader2 } from "lucide-react";
import { StructuredCriteriaPanel } from "@/components/StructuredCriteriaPanel";
import type { Tracker } from "../types";

interface TrackerCriteriaSectionProps {
  tracker: Tracker;
  isCollapsed: boolean;
  onToggleCollapsed: (collapsed: boolean) => void;
  isExtractingFromGuide: boolean;
  onExtractFromGuide: () => void;
}

export function TrackerCriteriaSection({
  tracker,
  isCollapsed,
  onToggleCollapsed,
  isExtractingFromGuide,
  onExtractFromGuide,
}: TrackerCriteriaSectionProps) {
  const hasStructuredCriteria = 
    tracker.size_criteria || 
    tracker.service_criteria || 
    tracker.geography_criteria || 
    tracker.buyer_types_criteria;

  return (
    <Collapsible open={!isCollapsed} onOpenChange={(open) => onToggleCollapsed(!open)}>
      <div className="bg-card rounded-lg border">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-2">
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              <h2 className="font-semibold">Buyer Fit Criteria</h2>
              {hasStructuredCriteria && (
                <span className="text-xs text-muted-foreground">(configured)</span>
              )}
            </div>
            {tracker.ma_guide_content && !hasStructuredCriteria && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onExtractFromGuide();
                }}
                disabled={isExtractingFromGuide}
              >
                {isExtractingFromGuide ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Extract from M&A Guide
                  </>
                )}
              </Button>
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-0">
            <StructuredCriteriaPanel
              sizeCriteria={tracker.size_criteria as any}
              serviceCriteria={tracker.service_criteria as any}
              geographyCriteria={tracker.geography_criteria as any}
              buyerTypesCriteria={tracker.buyer_types_criteria as any}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
