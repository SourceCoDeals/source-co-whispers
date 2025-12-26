import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ChevronDown, ChevronRight, Check, MapPin, DollarSign, Briefcase, Users } from "lucide-react";

interface ExtractedCriteria {
  industry_name?: string;
  size_criteria_text?: string;
  service_criteria_text?: string;
  geography_criteria_text?: string;
  buyer_types_text?: string;
  scoring_hints?: {
    geography_mode?: "strict" | "moderate" | "relaxed";
    size_importance?: "high" | "medium" | "low";
    geography_reasoning?: string;
  };
  additional_context?: string;
}

interface TrackerNotesSectionProps {
  onApply: (data: {
    industryName?: string;
    sizeCriteria: string;
    serviceCriteria: string;
    geographyCriteria: string;
    buyerTypesCriteria: string;
    scoringHints?: ExtractedCriteria["scoring_hints"];
  }) => void;
}

export function TrackerNotesSection({ onApply }: TrackerNotesSectionProps) {
  const [notes, setNotes] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedCriteria | null>(null);
  const { toast } = useToast();

  const analyzeNotes = async () => {
    if (!notes.trim()) {
      toast({ title: "No notes", description: "Please paste some notes to analyze", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-tracker-notes', {
        body: { notes }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Analysis failed');
      }

      setExtractedData(data.extracted);
      toast({ title: "Analysis complete", description: "Review the extracted criteria below" });
    } catch (err) {
      console.error('Analysis error:', err);
      toast({ 
        title: "Analysis failed", 
        description: err instanceof Error ? err.message : "Could not analyze notes",
        variant: "destructive" 
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyExtracted = () => {
    if (!extractedData) return;

    onApply({
      industryName: extractedData.industry_name,
      sizeCriteria: extractedData.size_criteria_text || "",
      serviceCriteria: extractedData.service_criteria_text || "",
      geographyCriteria: extractedData.geography_criteria_text || "",
      buyerTypesCriteria: extractedData.buyer_types_text || "",
      scoringHints: extractedData.scoring_hints,
    });

    toast({ title: "Applied!", description: "Criteria have been added to the form" });
    setExtractedData(null);
    setNotes("");
    setIsOpen(false);
  };

  const getGeographyModeLabel = (mode?: string) => {
    switch (mode) {
      case "strict": return "Strict (nearby required)";
      case "moderate": return "Moderate (regional preference)";
      case "relaxed": return "Relaxed (location flexible)";
      default: return null;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-primary/10 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Quick Import from Notes</CardTitle>
                  <CardDescription className="text-sm">
                    Paste call notes, emails, or meeting notes to auto-extract criteria
                  </CardDescription>
                </div>
              </div>
              {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div>
              <Label htmlFor="tracker-notes">Paste your notes here</Label>
              <Textarea
                id="tracker-notes"
                placeholder="Paste call transcripts, emails, meeting notes, or any text describing the buyer universe criteria...

Example:
'We're looking at collision repair companies in Texas and Oklahoma. Ideal targets have $5-25M revenue, 3+ locations, and strong DRP relationships. EBITDA should be at least $1M, and we're targeting 5-7x multiples. Geography matters - buyers need to be in the Southwest region...'"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 min-h-[150px]"
              />
            </div>

            <Button
              onClick={analyzeNotes}
              disabled={isAnalyzing || !notes.trim()}
              className="w-full"
              variant="secondary"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze & Extract
                </>
              )}
            </Button>

            {extractedData && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Extracted Criteria Preview</Label>
                  <Button size="sm" onClick={applyExtracted} className="gap-1">
                    <Check className="w-3 h-3" />
                    Apply to Form
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {extractedData.industry_name && (
                    <div className="col-span-full p-3 bg-background rounded-lg border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Briefcase className="w-3 h-3" />
                        Industry
                      </div>
                      <p className="text-sm font-medium">{extractedData.industry_name}</p>
                    </div>
                  )}

                  {extractedData.size_criteria_text && (
                    <div className="p-3 bg-background rounded-lg border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <DollarSign className="w-3 h-3" />
                        Size Criteria
                      </div>
                      <p className="text-sm whitespace-pre-line">{extractedData.size_criteria_text}</p>
                    </div>
                  )}

                  {extractedData.service_criteria_text && (
                    <div className="p-3 bg-background rounded-lg border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Briefcase className="w-3 h-3" />
                        Service Mix
                      </div>
                      <p className="text-sm whitespace-pre-line">{extractedData.service_criteria_text}</p>
                    </div>
                  )}

                  {extractedData.geography_criteria_text && (
                    <div className="p-3 bg-background rounded-lg border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <MapPin className="w-3 h-3" />
                        Geography
                      </div>
                      <p className="text-sm whitespace-pre-line">{extractedData.geography_criteria_text}</p>
                    </div>
                  )}

                  {extractedData.buyer_types_text && (
                    <div className="p-3 bg-background rounded-lg border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Users className="w-3 h-3" />
                        Buyer Types
                      </div>
                      <p className="text-sm whitespace-pre-line">{extractedData.buyer_types_text}</p>
                    </div>
                  )}
                </div>

                {extractedData.scoring_hints && (
                  <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Scoring Recommendations</p>
                    <div className="flex flex-wrap gap-2">
                      {extractedData.scoring_hints.geography_mode && (
                        <span className="text-xs px-2 py-1 bg-background rounded-full border">
                          Geography: {getGeographyModeLabel(extractedData.scoring_hints.geography_mode)}
                        </span>
                      )}
                      {extractedData.scoring_hints.size_importance && (
                        <span className="text-xs px-2 py-1 bg-background rounded-full border">
                          Size importance: {extractedData.scoring_hints.size_importance}
                        </span>
                      )}
                    </div>
                    {extractedData.scoring_hints.geography_reasoning && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {extractedData.scoring_hints.geography_reasoning}
                      </p>
                    )}
                  </div>
                )}

                {extractedData.additional_context && (
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Additional Context</p>
                    <p className="text-sm">{extractedData.additional_context}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
