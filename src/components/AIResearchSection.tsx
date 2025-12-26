import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ChevronDown, ChevronRight, Check, RotateCcw, DollarSign, MapPin, Users, Briefcase } from "lucide-react";
import { Label } from "@/components/ui/label";

interface ExtractedCriteria {
  sizeCriteria?: string;
  serviceCriteria?: string;
  geographyCriteria?: string;
  buyerTypesCriteria?: string;
}

interface AIResearchSectionProps {
  industryName: string;
  onApply: (data: {
    sizeCriteria: string;
    serviceCriteria: string;
    geographyCriteria: string;
    buyerTypesCriteria: string;
  }) => void;
  onGuideGenerated?: (guide: string, qaContext: Record<string, string>) => void;
}

type ResearchState = "idle" | "generating" | "complete";

export function AIResearchSection({ industryName, onApply, onGuideGenerated }: AIResearchSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<ResearchState>("idle");
  const [guideContent, setGuideContent] = useState("");
  const [streamProgress, setStreamProgress] = useState(0);
  const [extractedCriteria, setExtractedCriteria] = useState<ExtractedCriteria | null>(null);
  const [currentSection, setCurrentSection] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll as content streams in
  useEffect(() => {
    if (scrollRef.current && state === "generating") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [guideContent, state]);

  const generateGuide = async () => {
    if (!industryName.trim()) {
      toast({ title: "Missing industry", description: "Please enter an industry name first", variant: "destructive" });
      return;
    }

    setState("generating");
    setGuideContent("");
    setStreamProgress(0);
    setCurrentSection("Starting...");

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ma-guide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ industryName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE lines
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            
            // Handle different event types
            if (parsed.type === "progress") {
              setStreamProgress(parsed.progress || 0);
              if (parsed.section) setCurrentSection(parsed.section);
            } else if (parsed.type === "content") {
              fullContent += parsed.content || "";
              setGuideContent(fullContent);
            } else if (parsed.type === "criteria") {
              setExtractedCriteria(parsed.criteria);
            } else if (parsed.type === "complete") {
              setStreamProgress(100);
              setCurrentSection("Complete");
            } else if (parsed.choices?.[0]?.delta?.content) {
              // Standard OpenAI streaming format
              fullContent += parsed.choices[0].delta.content;
              setGuideContent(fullContent);
            }
          } catch {
            // Incomplete JSON, wait for more data
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Notify parent of generated guide (empty qaContext since we removed Q&A)
      if (onGuideGenerated) {
        onGuideGenerated(fullContent, {});
      }

      setState("complete");
      toast({ title: "Guide generated", description: `${fullContent.length.toLocaleString()} characters` });
    } catch (err) {
      console.error('Guide generation error:', err);
      toast({ 
        title: "Generation failed", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive" 
      });
      setState("idle");
    }
  };

  const applyExtracted = () => {
    if (!extractedCriteria) return;
    
    onApply({
      sizeCriteria: extractedCriteria.sizeCriteria || "",
      serviceCriteria: extractedCriteria.serviceCriteria || "",
      geographyCriteria: extractedCriteria.geographyCriteria || "",
      buyerTypesCriteria: extractedCriteria.buyerTypesCriteria || "",
    });

    toast({ title: "Applied!", description: "Criteria added to form" });
  };

  const reset = () => {
    setState("idle");
    setGuideContent("");
    setExtractedCriteria(null);
    setStreamProgress(0);
    setCurrentSection("");
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-primary/10 transition-colors rounded-t-lg py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-base">AI Industry Research</CardTitle>
                  <CardDescription className="text-sm">
                    Generate a comprehensive M&A guide for this industry
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {state === "complete" && (
                  <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> Guide Ready
                  </span>
                )}
                {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* State: Idle */}
            {state === "idle" && (
              <div className="text-center py-6">
                <Sparkles className="w-10 h-10 text-primary mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground mb-4">
                  Generate a comprehensive M&A guide with buyer types, valuation benchmarks, and fit criteria for{" "}
                  <span className="font-medium text-foreground">{industryName || "this industry"}</span>.
                </p>
                <Button 
                  onClick={generateGuide} 
                  disabled={!industryName.trim()}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate M&A Guide
                </Button>
                {!industryName.trim() && (
                  <p className="text-xs text-muted-foreground mt-2">Enter an industry name above to begin</p>
                )}
              </div>
            )}

            {/* State: Generating */}
            {state === "generating" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating guide...
                    </span>
                    <span className="font-medium">{Math.round(streamProgress)}%</span>
                  </div>
                  <Progress value={streamProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">{currentSection}</p>
                </div>

                <ScrollArea className="h-[300px] rounded-lg border bg-background p-4" ref={scrollRef}>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-xs font-mono">{guideContent || "Starting generation..."}</pre>
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* State: Complete */}
            {state === "complete" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">M&A Guide Generated</span>
                  <span className="text-xs text-muted-foreground">
                    ({guideContent.length.toLocaleString()} characters)
                  </span>
                </div>

                {/* Preview of guide */}
                <ScrollArea className="h-[200px] rounded-lg border bg-background p-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-xs font-mono">{guideContent.slice(0, 2000)}...</pre>
                  </div>
                </ScrollArea>

                {/* Extracted Criteria */}
                {extractedCriteria && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Extracted Buyer Fit Criteria</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {extractedCriteria.sizeCriteria && (
                        <div className="p-3 bg-background rounded-lg border">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <DollarSign className="w-3 h-3" />
                            Size Criteria
                          </div>
                          <p className="text-sm whitespace-pre-line">{extractedCriteria.sizeCriteria}</p>
                        </div>
                      )}
                      {extractedCriteria.serviceCriteria && (
                        <div className="p-3 bg-background rounded-lg border">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Briefcase className="w-3 h-3" />
                            Service Mix
                          </div>
                          <p className="text-sm whitespace-pre-line">{extractedCriteria.serviceCriteria}</p>
                        </div>
                      )}
                      {extractedCriteria.geographyCriteria && (
                        <div className="p-3 bg-background rounded-lg border">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <MapPin className="w-3 h-3" />
                            Geography
                          </div>
                          <p className="text-sm whitespace-pre-line">{extractedCriteria.geographyCriteria}</p>
                        </div>
                      )}
                      {extractedCriteria.buyerTypesCriteria && (
                        <div className="p-3 bg-background rounded-lg border">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Users className="w-3 h-3" />
                            Buyer Types
                          </div>
                          <p className="text-sm whitespace-pre-line">{extractedCriteria.buyerTypesCriteria}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={reset} className="gap-1">
                    <RotateCcw className="w-3 h-3" />
                    Start Over
                  </Button>
                  {extractedCriteria && (
                    <Button onClick={applyExtracted} className="flex-1 gap-2">
                      <Check className="w-4 h-4" />
                      Apply Criteria to Form
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
