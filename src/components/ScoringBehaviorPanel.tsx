import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Info, Save, RotateCcw, MapPin, DollarSign, Briefcase, MessageSquare } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ChevronDown } from "lucide-react";

interface ScoringBehavior {
  geography: {
    strictness: "strict" | "moderate" | "relaxed";
    single_location_rule: "same_state" | "adjacent_states" | "regional" | "national";
    multi_location_rule: "adjacent_states" | "regional" | "national";
    proximity_miles: number;
    allow_national_for_attractive_deals: boolean;
  };
  size: {
    strictness: "strict" | "moderate" | "relaxed";
    below_minimum_behavior: "disqualify" | "penalize" | "ignore";
    single_location_penalty: boolean;
  };
  services: {
    matching_mode: "semantic" | "keyword" | "hybrid";
    require_primary_focus_match: boolean;
    excluded_services_are_dealbreakers: boolean;
  };
  engagement: {
    override_geography: boolean;
    override_size: boolean;
    weight_multiplier: number;
  };
}

interface ScoringBehaviorPanelProps {
  scoringBehavior: ScoringBehavior | null;
  industryName: string;
  onSave: (behavior: ScoringBehavior) => Promise<void>;
  isSaving?: boolean;
}

const defaultBehavior: ScoringBehavior = {
  geography: {
    strictness: "moderate",
    single_location_rule: "adjacent_states",
    multi_location_rule: "regional",
    proximity_miles: 100,
    allow_national_for_attractive_deals: true,
  },
  size: {
    strictness: "strict",
    below_minimum_behavior: "penalize",
    single_location_penalty: true,
  },
  services: {
    matching_mode: "semantic",
    require_primary_focus_match: true,
    excluded_services_are_dealbreakers: true,
  },
  engagement: {
    override_geography: true,
    override_size: false,
    weight_multiplier: 1.0,
  },
};

// Industry presets
const industryPresets: Record<string, Partial<ScoringBehavior>> = {
  "collision_repair": {
    geography: {
      strictness: "strict",
      single_location_rule: "adjacent_states",
      multi_location_rule: "regional",
      proximity_miles: 100,
      allow_national_for_attractive_deals: true,
    },
    size: {
      strictness: "strict",
      below_minimum_behavior: "penalize",
      single_location_penalty: true,
    },
  },
  "software": {
    geography: {
      strictness: "relaxed",
      single_location_rule: "national",
      multi_location_rule: "national",
      proximity_miles: 0,
      allow_national_for_attractive_deals: true,
    },
    size: {
      strictness: "moderate",
      below_minimum_behavior: "penalize",
      single_location_penalty: false,
    },
  },
  "hvac": {
    geography: {
      strictness: "moderate",
      single_location_rule: "regional",
      multi_location_rule: "regional",
      proximity_miles: 150,
      allow_national_for_attractive_deals: true,
    },
  },
  "pest_control": {
    geography: {
      strictness: "moderate",
      single_location_rule: "regional",
      multi_location_rule: "national",
      proximity_miles: 200,
      allow_national_for_attractive_deals: true,
    },
  },
};

export function ScoringBehaviorPanel({ 
  scoringBehavior, 
  industryName, 
  onSave, 
  isSaving = false 
}: ScoringBehaviorPanelProps) {
  const [behavior, setBehavior] = useState<ScoringBehavior>(
    scoringBehavior || defaultBehavior
  );
  const [isOpen, setIsOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updateBehavior = (path: string[], value: any) => {
    const newBehavior = { ...behavior };
    let current: any = newBehavior;
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = { ...current[path[i]] };
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    setBehavior(newBehavior);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await onSave(behavior);
    setHasChanges(false);
  };

  const resetToDefaults = () => {
    setBehavior(defaultBehavior);
    setHasChanges(true);
  };

  const applyIndustryPreset = (preset: string) => {
    const presetConfig = industryPresets[preset];
    if (presetConfig) {
      setBehavior({
        ...defaultBehavior,
        ...presetConfig,
        geography: { ...defaultBehavior.geography, ...presetConfig.geography },
        size: { ...defaultBehavior.size, ...presetConfig.size },
        services: { ...defaultBehavior.services, ...presetConfig.services },
        engagement: { ...defaultBehavior.engagement, ...presetConfig.engagement },
      });
      setHasChanges(true);
    }
  };

  const strictnessLabel = (level: string) => {
    switch (level) {
      case "strict": return "Strict - Location matters significantly";
      case "moderate": return "Moderate - Some flexibility allowed";
      case "relaxed": return "Relaxed - Location is secondary";
      default: return level;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="font-medium">Scoring Behavior Configuration</span>
          {hasChanges && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
              Unsaved changes
            </Badge>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-4 pb-4">
        {/* Industry Presets */}
        <div className="mb-6 p-3 bg-muted/30 rounded-lg">
          <Label className="text-sm font-medium mb-2 block">Apply Industry Preset</Label>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(industryPresets).map(preset => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                onClick={() => applyIndustryPreset(preset)}
                className="text-xs capitalize"
              >
                {preset.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Presets configure scoring rules based on typical industry patterns
          </p>
        </div>

        {/* Geography Section */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="w-4 h-4 text-blue-500" />
            Geography Scoring
          </div>
          
          <div className="grid gap-4 pl-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Strictness Level</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p><strong>Strict:</strong> Buyers must be in same state or adjacent (auto repair, restaurants)</p>
                      <p><strong>Moderate:</strong> Regional matching allowed (HVAC, home services)</p>
                      <p><strong>Relaxed:</strong> Geography is secondary (software, tech services)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={behavior.geography.strictness}
                onValueChange={(v) => updateBehavior(["geography", "strictness"], v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">Strict - Location matters significantly</SelectItem>
                  <SelectItem value="moderate">Moderate - Some flexibility allowed</SelectItem>
                  <SelectItem value="relaxed">Relaxed - Location is secondary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Single-Location Deals</Label>
                <Select
                  value={behavior.geography.single_location_rule}
                  onValueChange={(v) => updateBehavior(["geography", "single_location_rule"], v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="same_state">Same state only</SelectItem>
                    <SelectItem value="adjacent_states">Adjacent states</SelectItem>
                    <SelectItem value="regional">Same region</SelectItem>
                    <SelectItem value="national">National (no restriction)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Multi-Location Deals (3+)</Label>
                <Select
                  value={behavior.geography.multi_location_rule}
                  onValueChange={(v) => updateBehavior(["geography", "multi_location_rule"], v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adjacent_states">Adjacent states</SelectItem>
                    <SelectItem value="regional">Same region</SelectItem>
                    <SelectItem value="national">National (no restriction)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Allow national buyers for attractive deals</Label>
                <p className="text-xs text-muted-foreground">High-value deals can attract buyers from further away</p>
              </div>
              <Switch
                checked={behavior.geography.allow_national_for_attractive_deals}
                onCheckedChange={(v) => updateBehavior(["geography", "allow_national_for_attractive_deals"], v)}
              />
            </div>
          </div>
        </div>

        {/* Size Section */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="w-4 h-4 text-green-500" />
            Size/Revenue Scoring
          </div>
          
          <div className="grid gap-4 pl-6">
            <div className="space-y-2">
              <Label className="text-sm">Strictness Level</Label>
              <Select
                value={behavior.size.strictness}
                onValueChange={(v) => updateBehavior(["size", "strictness"], v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">Strict - Size is a gating factor</SelectItem>
                  <SelectItem value="moderate">Moderate - Size influences score</SelectItem>
                  <SelectItem value="relaxed">Relaxed - Size is one of many factors</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">When deal is below buyer's minimum</Label>
              <Select
                value={behavior.size.below_minimum_behavior}
                onValueChange={(v) => updateBehavior(["size", "below_minimum_behavior"], v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disqualify">Disqualify - Remove from matches</SelectItem>
                  <SelectItem value="penalize">Penalize - Reduce score significantly</SelectItem>
                  <SelectItem value="ignore">Ignore - Don't factor into score</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Penalize single-location deals</Label>
                <p className="text-xs text-muted-foreground">Apply penalty when matching single locations to platform buyers</p>
              </div>
              <Switch
                checked={behavior.size.single_location_penalty}
                onCheckedChange={(v) => updateBehavior(["size", "single_location_penalty"], v)}
              />
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Briefcase className="w-4 h-4 text-purple-500" />
            Service Matching
          </div>
          
          <div className="grid gap-4 pl-6">
            <div className="space-y-2">
              <Label className="text-sm">Matching Mode</Label>
              <Select
                value={behavior.services.matching_mode}
                onValueChange={(v) => updateBehavior(["services", "matching_mode"], v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semantic">Semantic (AI-powered) - Best accuracy</SelectItem>
                  <SelectItem value="keyword">Keyword - Faster, exact matches</SelectItem>
                  <SelectItem value="hybrid">Hybrid - Keywords with AI fallback</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Require primary focus match</Label>
                <p className="text-xs text-muted-foreground">Deal must match tracker's primary service focus</p>
              </div>
              <Switch
                checked={behavior.services.require_primary_focus_match}
                onCheckedChange={(v) => updateBehavior(["services", "require_primary_focus_match"], v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Excluded services are dealbreakers</Label>
                <p className="text-xs text-muted-foreground">Disqualify if deal has excluded services</p>
              </div>
              <Switch
                checked={behavior.services.excluded_services_are_dealbreakers}
                onCheckedChange={(v) => updateBehavior(["services", "excluded_services_are_dealbreakers"], v)}
              />
            </div>
          </div>
        </div>

        {/* Engagement Section */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="w-4 h-4 text-amber-500" />
            Engagement Overrides
          </div>
          
          <div className="grid gap-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Can override geography</Label>
                <p className="text-xs text-muted-foreground">Strong interest from buyer bypasses geography restrictions</p>
              </div>
              <Switch
                checked={behavior.engagement.override_geography}
                onCheckedChange={(v) => updateBehavior(["engagement", "override_geography"], v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Can override size</Label>
                <p className="text-xs text-muted-foreground">Strong interest bypasses size restrictions</p>
              </div>
              <Switch
                checked={behavior.engagement.override_size}
                onCheckedChange={(v) => updateBehavior(["engagement", "override_size"], v)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Engagement weight multiplier</Label>
                <span className="text-sm font-mono">{behavior.engagement.weight_multiplier.toFixed(1)}x</span>
              </div>
              <Slider
                value={[behavior.engagement.weight_multiplier * 10]}
                onValueChange={([v]) => updateBehavior(["engagement", "weight_multiplier"], v / 10)}
                min={5}
                max={20}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">How much weight to give engagement signals (0.5x - 2.0x)</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset to defaults
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
