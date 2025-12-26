import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, TrendingUp, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAllTemplates, getIndustryTemplate, templateToKPIConfig } from "@/lib/industryTemplates";

interface KPIRule {
  field_name: string;
  display_name: string;
  weight: number;
  scoring_rules: {
    ideal_range?: [number, number];
    bonus_per_item?: number;
    max_bonus?: number;
    boolean_bonus?: number;
  };
}

interface KPIConfig {
  kpis?: KPIRule[];
}

interface KPIConfigPanelProps {
  config: KPIConfig | null;
  industryName?: string;
  onChange: (config: KPIConfig) => void;
}

export function KPIConfigPanel({ config, industryName, onChange }: KPIConfigPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const kpis = config?.kpis || [];

  const addKPI = () => {
    const newKPI: KPIRule = {
      field_name: `kpi_${Date.now()}`,
      display_name: "New KPI",
      weight: 5,
      scoring_rules: {
        ideal_range: [0, 100]
      }
    };
    onChange({ kpis: [...kpis, newKPI] });
  };

  const updateKPI = (index: number, updates: Partial<KPIRule>) => {
    const updated = [...kpis];
    updated[index] = { ...updated[index], ...updates };
    onChange({ kpis: updated });
  };

  const removeKPI = (index: number) => {
    onChange({ kpis: kpis.filter((_, i) => i !== index) });
  };

  const loadTemplate = (templateKey: string) => {
    const template = getIndustryTemplate(templateKey);
    if (template) {
      const kpiConfig = templateToKPIConfig(template);
      onChange(kpiConfig);
    }
  };

  const templates = getAllTemplates();

  if (!isExpanded) {
    return (
      <div className="border rounded-lg p-4 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Industry KPI Scoring</span>
            {kpis.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {kpis.length} KPI{kpis.length !== 1 ? 's' : ''} configured
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Industry KPIs add bonus points to buyer scores when deals have matching data. Missing data is never penalized.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="sm" onClick={() => setIsExpanded(true)}>
              Configure
            </Button>
          </div>
        </div>
        {kpis.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {kpis.slice(0, 5).map((kpi, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {kpi.display_name} (+{kpi.weight}pt)
              </Badge>
            ))}
            {kpis.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{kpis.length - 5} more
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Industry KPI Scoring Configuration</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
          Collapse
        </Button>
      </div>

      {/* Template selector */}
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Load from template:</Label>
        <Select onValueChange={loadTemplate}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Select template..." />
          </SelectTrigger>
          <SelectContent>
            {templates.map(t => (
              <SelectItem key={t.id} value={t.id} className="text-xs">
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI List */}
      <div className="space-y-3">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-background border rounded-md p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Display Name</Label>
                  <Input
                    value={kpi.display_name}
                    onChange={(e) => updateKPI(idx, { display_name: e.target.value })}
                    className="h-8 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Field Name (snake_case)</Label>
                  <Input
                    value={kpi.field_name}
                    onChange={(e) => updateKPI(idx, { field_name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="h-8 text-sm mt-1 font-mono"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeKPI(idx)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Weight (bonus pts)</Label>
                <Input
                  type="number"
                  value={kpi.weight}
                  onChange={(e) => updateKPI(idx, { weight: parseInt(e.target.value) || 0 })}
                  className="h-8 text-sm mt-1"
                  min={1}
                  max={30}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ideal Min</Label>
                <Input
                  type="number"
                  value={kpi.scoring_rules.ideal_range?.[0] ?? 0}
                  onChange={(e) => updateKPI(idx, { 
                    scoring_rules: { 
                      ...kpi.scoring_rules, 
                      ideal_range: [parseInt(e.target.value) || 0, kpi.scoring_rules.ideal_range?.[1] ?? 100] 
                    } 
                  })}
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ideal Max</Label>
                <Input
                  type="number"
                  value={kpi.scoring_rules.ideal_range?.[1] ?? 100}
                  onChange={(e) => updateKPI(idx, { 
                    scoring_rules: { 
                      ...kpi.scoring_rules, 
                      ideal_range: [kpi.scoring_rules.ideal_range?.[0] ?? 0, parseInt(e.target.value) || 100] 
                    } 
                  })}
                  className="h-8 text-sm mt-1"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addKPI} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Add KPI
      </Button>

      <p className="text-xs text-muted-foreground">
        KPIs are optional scoring bonuses. When a deal has matching data, it earns bonus points. Missing data is never penalized.
      </p>
    </div>
  );
}
