import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ChevronDown, ChevronRight, Check, RotateCcw, DollarSign, MapPin, Users, Briefcase, Download, AlertTriangle, CheckCircle2, XCircle, Table2, FileText, Hash } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface ExtractedCriteria {
  sizeCriteria?: string;
  serviceCriteria?: string;
  geographyCriteria?: string;
  buyerTypesCriteria?: string;
  primaryFocusServices?: string[];
  excludedServices?: string[];
}

interface QualityResult {
  passed: boolean;
  score: number;
  wordCount: number;
  sectionsFound: string[];
  missingElements: string[];
  tableCount: number;
  placeholderCount?: number;
  industryMentions?: number;
  dataRowCount?: number;
  issues: string[];
  afterGapFill?: boolean;
  attempt?: number;
  hasCriteria?: boolean;
  hasBuyerTypes?: boolean;
  hasPrimaryFocus?: boolean;
}

export interface UploadedGuideDoc {
  name: string;
  path: string;
  size: number;
}

interface AIResearchSectionProps {
  industryName: string;
  trackerId?: string; // For existing trackers
  onApply: (data: {
    sizeCriteria: string;
    serviceCriteria: string;
    geographyCriteria: string;
    buyerTypesCriteria: string;
    primaryFocusServices?: string[];
    excludedServices?: string[];
  }) => void;
  onGuideGenerated?: (guide: string, qaContext: Record<string, string>) => void;
  onGuideDocumentUploaded?: (doc: UploadedGuideDoc) => void;
}

type ResearchState = "idle" | "generating" | "quality_check" | "gap_filling" | "complete";

export function AIResearchSection({ industryName, trackerId, onApply, onGuideGenerated, onGuideDocumentUploaded }: AIResearchSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<ResearchState>("idle");
  const [guideContent, setGuideContent] = useState("");
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseName, setPhaseName] = useState("");
  const [extractedCriteria, setExtractedCriteria] = useState<ExtractedCriteria | null>(null);
  const [qualityResult, setQualityResult] = useState<QualityResult | null>(null);
  const [gapFillAttempt, setGapFillAttempt] = useState(0);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
    setOverallProgress(0);
    setCurrentPhase(1);
    setPhaseName("Industry Fundamentals");
    setQualityResult(null);
    setGapFillAttempt(0);

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
            
            switch (parsed.type) {
              case "phase_start":
                setCurrentPhase(parsed.phase);
                setPhaseName(parsed.phaseName);
                break;
              case "content":
                fullContent += parsed.content || "";
                setGuideContent(fullContent);
                setOverallProgress(parsed.overallProgress || 0);
                break;
              case "phase_complete":
                toast({ 
                  title: `Phase ${parsed.phase} complete`, 
                  description: `${parsed.phaseName}: ${parsed.phaseWordCount?.toLocaleString()} words` 
                });
                break;
              case "quality_check_start":
                setState("quality_check");
                setPhaseName("Quality Check");
                break;
              case "quality_check_result":
                setQualityResult(parsed as QualityResult);
                break;
              case "gap_fill_start":
                setState("gap_filling");
                setPhaseName(`Improving (Attempt ${parsed.attempt || 1})`);
                setGapFillAttempt(parsed.attempt || 1);
                break;
              case "gap_fill_content":
                fullContent += parsed.content || "";
                setGuideContent(fullContent);
                break;
              case "final_quality":
                setQualityResult(parsed as QualityResult);
                break;
              case "criteria":
                setExtractedCriteria(parsed.criteria);
                // AUTO-APPLY criteria when extracted
                if (parsed.criteria) {
                  const criteria = parsed.criteria;
                  const isEmpty = !criteria.sizeCriteria && !criteria.serviceCriteria &&
                                  !criteria.geographyCriteria && !criteria.buyerTypesCriteria;
                  if (!isEmpty) {
                    console.log('[AIResearchSection] Auto-applying extracted criteria:', criteria);
                    onApply({
                      sizeCriteria: criteria.sizeCriteria || "",
                      serviceCriteria: criteria.serviceCriteria || "",
                      geographyCriteria: criteria.geographyCriteria || "",
                      buyerTypesCriteria: criteria.buyerTypesCriteria || "",
                      primaryFocusServices: criteria.primaryFocusServices || [],
                      excludedServices: criteria.excludedServices || [],
                    });
                  }
                }
                break;
              case "complete":
                setState("complete");
                setOverallProgress(100);
                if (parsed.quality) {
                  setQualityResult(parsed.quality);
                }
                toast({ 
                  title: "Guide generated & criteria applied!", 
                  description: `${parsed.wordCount?.toLocaleString()} words. Buyer fit criteria automatically populated.` 
                });
                // Auto-upload the guide as a supporting document
                if (onGuideDocumentUploaded) {
                  uploadGuideAsDocument(fullContent);
                }
                break;
              case "error":
                toast({ title: "Error", description: parsed.message, variant: "destructive" });
                break;
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (onGuideGenerated) {
        onGuideGenerated(fullContent, {});
      }

      if (state !== "complete") {
        setState("complete");
      }
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
    
    // Check for empty criteria
    const isEmpty = !extractedCriteria.sizeCriteria && !extractedCriteria.serviceCriteria &&
                    !extractedCriteria.geographyCriteria && !extractedCriteria.buyerTypesCriteria;
    
    if (isEmpty) {
      toast({ 
        title: "No Criteria Found", 
        description: "Could not extract criteria from the guide. Try regenerating.",
        variant: "destructive" 
      });
      return;
    }
    
    // Log what we're applying
    console.log('[AIResearchSection] Applying extracted criteria:', {
      sizeCriteria: extractedCriteria.sizeCriteria?.length || 0,
      serviceCriteria: extractedCriteria.serviceCriteria?.length || 0,
      geographyCriteria: extractedCriteria.geographyCriteria?.length || 0,
      buyerTypesCriteria: extractedCriteria.buyerTypesCriteria?.length || 0,
      primaryFocusServices: extractedCriteria.primaryFocusServices,
      excludedServices: extractedCriteria.excludedServices
    });
    
    // Pass ALL extracted data including primaryFocusServices
    onApply({
      sizeCriteria: extractedCriteria.sizeCriteria || "",
      serviceCriteria: extractedCriteria.serviceCriteria || "",
      geographyCriteria: extractedCriteria.geographyCriteria || "",
      buyerTypesCriteria: extractedCriteria.buyerTypesCriteria || "",
      primaryFocusServices: extractedCriteria.primaryFocusServices || [],
      excludedServices: extractedCriteria.excludedServices || [],
    });
    
    const foundCount = [
      extractedCriteria.sizeCriteria,
      extractedCriteria.serviceCriteria,
      extractedCriteria.geographyCriteria,
      extractedCriteria.buyerTypesCriteria
    ].filter(c => c && c.length > 50).length;
    
    const primaryCount = extractedCriteria.primaryFocusServices?.length || 0;
    
    toast({ 
      title: "Criteria Applied!", 
      description: `${foundCount}/4 sections extracted. ${primaryCount} primary focus service${primaryCount !== 1 ? 's' : ''}.` 
    });
  };

  const reset = () => {
    setState("idle");
    setGuideContent("");
    setExtractedCriteria(null);
    setOverallProgress(0);
    setCurrentPhase(0);
    setPhaseName("");
    setQualityResult(null);
    setGapFillAttempt(0);
  };

  // Upload the generated guide as a document to storage
  const uploadGuideAsDocument = async (content: string): Promise<UploadedGuideDoc | null> => {
    if (!content || !onGuideDocumentUploaded) return null;
    
    setIsUploadingDoc(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[AIResearchSection] No user found for guide upload');
        return null;
      }

      // Create DOCX document
      const lines = content.split('\n');
      const children: Paragraph[] = [];

      for (const line of lines) {
        if (line.startsWith('## ') || line.startsWith('# ')) {
          children.push(new Paragraph({
            text: line.replace(/^#+\s*/, ''),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }));
        } else if (line.startsWith('### ')) {
          children.push(new Paragraph({
            text: line.replace(/^###\s*/, ''),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          }));
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          children.push(new Paragraph({
            children: [new TextRun(line.replace(/^[-*]\s*/, '• '))],
            spacing: { before: 100 },
          }));
        } else if (line.trim()) {
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          const runs: TextRun[] = parts.map(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return new TextRun({ text: part.slice(2, -2), bold: true });
            }
            return new TextRun(part);
          });
          children.push(new Paragraph({ children: runs, spacing: { before: 100 } }));
        } else {
          children.push(new Paragraph({ text: '' }));
        }
      }

      const doc = new Document({ sections: [{ properties: {}, children }] });
      const blob = await Packer.toBlob(doc);
      
      const sanitizedName = industryName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${sanitizedName}_MA_Guide.docx`;
      const filePath = `${user.id}/${Date.now()}-${fileName}`;

      const { error } = await supabase.storage
        .from("tracker-documents")
        .upload(filePath, blob);

      if (error) {
        console.error('[AIResearchSection] Failed to upload guide:', error);
        toast({ 
          title: "Guide upload failed", 
          description: "Guide generated but could not be saved as document",
          variant: "destructive"
        });
        return null;
      }

      const uploadedDoc: UploadedGuideDoc = {
        name: fileName,
        path: filePath,
        size: blob.size,
      };

      console.log('[AIResearchSection] Guide uploaded as document:', uploadedDoc);
      onGuideDocumentUploaded(uploadedDoc);
      
      return uploadedDoc;
    } catch (err) {
      console.error('[AIResearchSection] Error uploading guide:', err);
      return null;
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const downloadAsDoc = async () => {
    if (!guideContent) return;
    const lines = guideContent.split('\n');
    const children: Paragraph[] = [];

    for (const line of lines) {
      if (line.startsWith('## ') || line.startsWith('# ')) {
        children.push(new Paragraph({
          text: line.replace(/^#+\s*/, ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }));
      } else if (line.startsWith('### ')) {
        children.push(new Paragraph({
          text: line.replace(/^###\s*/, ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        }));
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        children.push(new Paragraph({
          children: [new TextRun(line.replace(/^[-*]\s*/, '• '))],
          spacing: { before: 100 },
        }));
      } else if (line.trim()) {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const runs: TextRun[] = parts.map(part => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return new TextRun({ text: part.slice(2, -2), bold: true });
          }
          return new TextRun(part);
        });
        children.push(new Paragraph({ children: runs, spacing: { before: 100 } }));
      } else {
        children.push(new Paragraph({ text: '' }));
      }
    }

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const blob = await Packer.toBlob(doc);
    const fileName = `${industryName.replace(/[^a-zA-Z0-9]/g, '_')}_MA_Guide.docx`;
    saveAs(blob, fileName);
    toast({ title: "Downloaded", description: fileName });
  };

  const isGenerating = state === "generating" || state === "quality_check" || state === "gap_filling";

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
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
                    Generate a comprehensive 35+ page M&A guide
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
            {state === "idle" && (
              <div className="text-center py-6">
                <Sparkles className="w-10 h-10 text-primary mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground mb-4">
                  Generate a comprehensive M&A guide with buyer types, valuation benchmarks, and fit criteria for{" "}
                  <span className="font-medium text-foreground">{industryName || "this industry"}</span>.
                </p>
                <Button onClick={generateGuide} disabled={!industryName.trim()} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate M&A Guide
                </Button>
                {!industryName.trim() && (
                  <p className="text-xs text-muted-foreground mt-2">Enter an industry name above to begin</p>
                )}
              </div>
            )}

            {isGenerating && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {state === "quality_check" ? "Validating quality..." : 
                       state === "gap_filling" ? `Improving content (Attempt ${gapFillAttempt})...` :
                       `Phase ${currentPhase}/3: ${phaseName}`}
                    </span>
                    <span className="font-medium">{Math.round(overallProgress)}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                  <div className="flex gap-2">
                    {[1, 2, 3].map(p => (
                      <Badge 
                        key={p} 
                        variant={p < currentPhase ? "default" : p === currentPhase ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {p === 1 ? "Fundamentals" : p === 2 ? "Attractiveness" : "Application"}
                      </Badge>
                    ))}
                    {(state === "quality_check" || state === "gap_filling") && (
                      <Badge variant="outline" className="text-xs ml-auto">
                        {state === "quality_check" ? "Quality Check" : `Gap Fill #${gapFillAttempt}`}
                      </Badge>
                    )}
                  </div>
                </div>

                {qualityResult && state !== "generating" && (
                  <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Live Quality Score</span>
                      <Badge variant={getScoreBadgeVariant(qualityResult.score)}>
                        {qualityResult.score}/100
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="text-center p-1 bg-background rounded">
                        <FileText className="w-3 h-3 mx-auto mb-1 text-muted-foreground" />
                        <div className="font-medium">{qualityResult.wordCount.toLocaleString()}</div>
                        <div className="text-muted-foreground">Words</div>
                      </div>
                      <div className="text-center p-1 bg-background rounded">
                        <Table2 className="w-3 h-3 mx-auto mb-1 text-muted-foreground" />
                        <div className="font-medium">{qualityResult.tableCount}</div>
                        <div className="text-muted-foreground">Tables</div>
                      </div>
                      <div className="text-center p-1 bg-background rounded">
                        <Hash className="w-3 h-3 mx-auto mb-1 text-muted-foreground" />
                        <div className={`font-medium ${(qualityResult.placeholderCount || 0) > 10 ? 'text-red-500' : ''}`}>
                          {qualityResult.placeholderCount || 0}
                        </div>
                        <div className="text-muted-foreground">Placeholders</div>
                      </div>
                      <div className="text-center p-1 bg-background rounded">
                        <div className="w-3 h-3 mx-auto mb-1 text-muted-foreground text-xs font-bold">#</div>
                        <div className="font-medium">{qualityResult.dataRowCount || 0}</div>
                        <div className="text-muted-foreground">Data Rows</div>
                      </div>
                    </div>
                  </div>
                )}

                <ScrollArea className="h-[300px] rounded-lg border bg-background p-4" ref={scrollRef}>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-xs font-mono">{guideContent || "Starting generation..."}</pre>
                  </div>
                </ScrollArea>
              </div>
            )}

            {state === "complete" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {qualityResult?.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    )}
                    <span className="font-medium">
                      {qualityResult?.passed ? "M&A Guide Generated" : "Guide Generated (Quality Issues)"}
                    </span>
                  </div>
                  {qualityResult && (
                    <Badge variant={getScoreBadgeVariant(qualityResult.score)}>
                      Score: {qualityResult.score}/100
                    </Badge>
                  )}
                </div>

                {qualityResult && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-muted rounded text-center">
                      <FileText className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                      <div className="font-medium text-lg">{qualityResult.wordCount.toLocaleString()}</div>
                      <div className="text-muted-foreground">Words</div>
                    </div>
                    <div className="p-2 bg-muted rounded text-center">
                      <Table2 className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                      <div className="font-medium text-lg">{qualityResult.tableCount}</div>
                      <div className="text-muted-foreground">Tables</div>
                    </div>
                    <div className="p-2 bg-muted rounded text-center">
                      <div className="w-4 h-4 mx-auto mb-1 flex items-center justify-center">
                        {(qualityResult.placeholderCount || 0) < 10 ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className={`font-medium text-lg ${(qualityResult.placeholderCount || 0) > 10 ? 'text-red-500' : 'text-green-600'}`}>
                        {qualityResult.placeholderCount || 0}
                      </div>
                      <div className="text-muted-foreground">Placeholders</div>
                    </div>
                    <div className="p-2 bg-muted rounded text-center">
                      <Hash className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                      <div className="font-medium text-lg">{qualityResult.dataRowCount || 0}</div>
                      <div className="text-muted-foreground">Data Rows</div>
                    </div>
                  </div>
                )}

                {qualityResult && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-muted rounded">
                      <div className="text-muted-foreground mb-1">Sections Found</div>
                      <div className="font-medium">{qualityResult.sectionsFound.length}/14</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="text-muted-foreground mb-1">Industry Mentions</div>
                      <div className={`font-medium ${(qualityResult.industryMentions || 0) < 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {qualityResult.industryMentions || 0}
                      </div>
                    </div>
                  </div>
                )}

                {qualityResult?.issues && qualityResult.issues.length > 0 && (
                  <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="flex items-center gap-2 text-yellow-600 text-sm mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      Quality Notes ({qualityResult.issues.length})
                    </div>
                    <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                      {qualityResult.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <ScrollArea className="h-[200px] rounded-lg border bg-background p-4">
                  <pre className="whitespace-pre-wrap text-xs font-mono">{guideContent.slice(0, 5000)}...</pre>
                </ScrollArea>

                {extractedCriteria && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Extracted Buyer Fit Criteria</Label>
                      {extractedCriteria.primaryFocusServices && extractedCriteria.primaryFocusServices.length > 0 && (
                        <Badge variant="default" className="text-xs">
                          {extractedCriteria.primaryFocusServices.length} Primary Focus Services
                        </Badge>
                      )}
                    </div>
                    
                    {/* Primary Focus Services - Critical for Scoring */}
                    {extractedCriteria.primaryFocusServices && extractedCriteria.primaryFocusServices.length > 0 && (
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 mb-2">
                          <CheckCircle2 className="w-3 h-3" />
                          Primary Focus Services (for scoring)
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {extractedCriteria.primaryFocusServices.map((service, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs bg-green-500/20">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Excluded Services */}
                    {extractedCriteria.excludedServices && extractedCriteria.excludedServices.length > 0 && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400 mb-2">
                          <XCircle className="w-3 h-3" />
                          Excluded Services (avoid)
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {extractedCriteria.excludedServices.map((service, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs border-red-500/30 text-red-600">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Warning if no primary focus extracted */}
                    {(!extractedCriteria.primaryFocusServices || extractedCriteria.primaryFocusServices.length === 0) && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-400">
                          <AlertTriangle className="w-3 h-3" />
                          No primary focus services extracted. Deal scoring may not work correctly.
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {extractedCriteria.sizeCriteria && (
                        <div className="p-3 bg-background rounded-lg border">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <DollarSign className="w-3 h-3" />
                            Size Criteria
                          </div>
                          <p className="text-sm whitespace-pre-line line-clamp-4">{extractedCriteria.sizeCriteria}</p>
                        </div>
                      )}
                      {extractedCriteria.serviceCriteria && (
                        <div className="p-3 bg-background rounded-lg border">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Briefcase className="w-3 h-3" />
                            Service Mix
                          </div>
                          <p className="text-sm whitespace-pre-line line-clamp-4">{extractedCriteria.serviceCriteria}</p>
                        </div>
                      )}
                      {extractedCriteria.geographyCriteria && (
                        <div className="p-3 bg-background rounded-lg border">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <MapPin className="w-3 h-3" />
                            Geography
                          </div>
                          <p className="text-sm whitespace-pre-line line-clamp-4">{extractedCriteria.geographyCriteria}</p>
                        </div>
                      )}
                      {extractedCriteria.buyerTypesCriteria && (
                        <div className="p-3 bg-background rounded-lg border">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Users className="w-3 h-3" />
                            Buyer Types
                          </div>
                          <p className="text-sm whitespace-pre-line line-clamp-4">{extractedCriteria.buyerTypesCriteria}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={reset} className="gap-1">
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadAsDoc} className="gap-1">
                    <Download className="w-3 h-3" />
                    Download .docx
                  </Button>
                  {extractedCriteria && (
                    <Button size="sm" onClick={applyExtracted} className="gap-1 ml-auto">
                      <Check className="w-3 h-3" />
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
