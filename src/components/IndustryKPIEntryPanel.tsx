import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, Info, ChevronDown, ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface KPIRule {
  field_name: string;
  display_name: string;
  weight: number;
  description?: string;
  scoring_rules: {
    ideal_range?: [number, number];
    bonus_per_item?: number;
    boolean?: boolean;
  };
}

interface KPIConfig {
  template_name?: string;
  kpis?: KPIRule[];
}

interface IndustryKPIEntryPanelProps {
  kpiConfig: KPIConfig | null;
  currentValues: Record<string, any>;
  onValuesChange: (values: Record<string, any>) => void;
}

export function IndustryKPIEntryPanel({ 
  kpiConfig, 
  currentValues, 
  onValuesChange 
}: IndustryKPIEntryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localValues, setLocalValues] = useState<Record<string, any>>(currentValues || {});

  useEffect(() => {
    setLocalValues(currentValues || {});
  }, [currentValues]);

  if (!kpiConfig?.kpis || kpiConfig.kpis.length === 0) {
    return null;
  }

  const kpis = kpiConfig.kpis;
  const filledCount = kpis.filter(kpi => localValues[kpi.field_name] !== undefined && localValues[kpi.field_name] !== null && localValues[kpi.field_name] !== '').length;

  const updateValue = (fieldName: string, value: any) => {
    const newValues = { ...localValues, [fieldName]: value };
    setLocalValues(newValues);
  };

  const handleSave = () => {
    // Convert string numbers to actual numbers for numeric fields
    const processedValues: Record<string, any> = {};
    kpis.forEach(kpi => {
      const value = localValues[kpi.field_name];
      if (value !== undefined && value !== null && value !== '') {
        if (kpi.scoring_rules.boolean) {
          processedValues[kpi.field_name] = Boolean(value);
        } else if (kpi.scoring_rules.ideal_range) {
          processedValues[kpi.field_name] = parseFloat(value) || 0;
        } else if (kpi.scoring_rules.bonus_per_item) {
          // Array of items - keep as is or convert from comma-separated
          if (typeof value === 'string') {
            processedValues[kpi.field_name] = value.split(',').map(s => s.trim()).filter(Boolean);
          } else {
            processedValues[kpi.field_name] = value;
          }
        } else {
          processedValues[kpi.field_name] = value;
        }
      }
    });
    onValuesChange(processedValues);
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="border rounded-lg bg-muted/20">
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Industry KPIs</span>
            {kpiConfig.template_name && (
              <Badge variant="outline" className="text-xs">
                {kpiConfig.template_name}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {filledCount}/{kpis.length} filled
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Optional industry-specific data. Filling these adds bonus points to buyer matching scores.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kpis.map((kpi) => (
                <div key={kpi.field_name} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-medium">{kpi.display_name}</Label>
                    {kpi.description && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">{kpi.description}</p>
                            {kpi.scoring_rules.ideal_range && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Ideal range: {kpi.scoring_rules.ideal_range[0]} - {kpi.scoring_rules.ideal_range[1]}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      +{kpi.weight}pt
                    </Badge>
                  </div>
                  
                  {kpi.scoring_rules.boolean ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={Boolean(localValues[kpi.field_name])}
                        onCheckedChange={(checked) => updateValue(kpi.field_name, checked)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {localValues[kpi.field_name] ? 'Yes' : 'No'}
                      </span>
                    </div>
                  ) : kpi.scoring_rules.bonus_per_item ? (
                    <Input
                      value={
                        Array.isArray(localValues[kpi.field_name]) 
                          ? localValues[kpi.field_name].join(', ')
                          : localValues[kpi.field_name] || ''
                      }
                      onChange={(e) => updateValue(kpi.field_name, e.target.value)}
                      placeholder="Enter items separated by commas"
                      className="h-8 text-sm"
                    />
                  ) : (
                    <Input
                      type="number"
                      value={localValues[kpi.field_name] ?? ''}
                      onChange={(e) => updateValue(kpi.field_name, e.target.value)}
                      placeholder={
                        kpi.scoring_rules.ideal_range 
                          ? `${kpi.scoring_rules.ideal_range[0]} - ${kpi.scoring_rules.ideal_range[1]}`
                          : 'Enter value'
                      }
                      className="h-8 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button size="sm" onClick={handleSave}>
                Save KPIs
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              These fields are optional but improve matching accuracy. Missing data is never penalized.
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
