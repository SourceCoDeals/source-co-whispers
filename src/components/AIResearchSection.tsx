import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ChevronDown, ChevronRight, Check, RotateCcw, DollarSign, MapPin, Users, Briefcase, Download, AlertTriangle, CheckCircle2, XCircle, Table2, FileText, Hash, Wand2, ThumbsUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { validateBeforeSave, detectPlaceholders } from "@/lib/criteriaValidation";
import { parseCriteria, TrackerCriteria } from "@/lib/criteriaSchema";
import { CriteriaValidationAlert } from "@/components/CriteriaValidationAlert";
import { validateCriteriaComprehensive, ComprehensiveValidationResult } from "@/lib/criteriaValidation";

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

interface CriteriaValidationState {
  validation: ComprehensiveValidationResult | null;
  preSaveResult: { canSave: boolean; blockers: string[]; warnings: string[]; suggestions: string[] } | null;
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

type ResearchState = "idle" | "generating" | "quality_check" | "gap_filling" | "fixing" | "complete";

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
  const [isFixing, setIsFixing] = useState(false);
  const [fixingIssue, setFixingIssue] = useState<string>("");
  const [fixProgress, setFixProgress] = useState({ current: 0, total: 0 });
  const [acceptedAnyway, setAcceptedAnyway] = useState(false);
  const [criteriaValidation, setCriteriaValidation] = useState<CriteriaValidationState>({ validation: null, preSaveResult: null });
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Validate extracted criteria whenever it changes
  useEffect(() => {
    if (extractedCriteria) {
      // Build TrackerCriteria from extracted data for validation
      const trackerCriteria: TrackerCriteria = parseCriteria({
        size_criteria: extractedCriteria.sizeCriteria ? { raw_text: extractedCriteria.sizeCriteria } : null,
        service_criteria: {
          primary_focus: extractedCriteria.primaryFocusServices || [],
          excluded_services: extractedCriteria.excludedServices || [],
          raw_text: extractedCriteria.serviceCriteria
        },
        geography_criteria: extractedCriteria.geographyCriteria ? { raw_text: extractedCriteria.geographyCriteria } : null,
        buyer_types_criteria: extractedCriteria.buyerTypesCriteria ? { raw_text: extractedCriteria.buyerTypesCriteria } : null
      });
      
      const validation = validateCriteriaComprehensive(trackerCriteria);
      const preSaveResult = validateBeforeSave(trackerCriteria);
      
      setCriteriaValidation({ validation, preSaveResult });
      
      // Check for placeholders in raw text
      const allText = [
        extractedCriteria.sizeCriteria,
        extractedCriteria.serviceCriteria,
        extractedCriteria.geographyCriteria,
        extractedCriteria.buyerTypesCriteria
      ].filter(Boolean).join(' ');
      
      const placeholders = detectPlaceholders(allText);
      if (placeholders.length > 0) {
        console.warn('[AIResearchSection] Placeholders detected in criteria:', placeholders);
      }
    } else {
      setCriteriaValidation({ validation: null, preSaveResult: null });
    }
  }, [extractedCriteria]);

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
                console.log('[AIResearchSection] Quality check result:', parsed);
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
                console.log('[AIResearchSection] Final quality:', parsed);
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
                    
                    // For EXISTING trackers (trackerId provided), save criteria directly to database
                    if (trackerId) {
                      console.log('[AIResearchSection] Saving criteria to database for tracker:', trackerId);
                      const criteriaText = `Size Criteria: ${criteria.sizeCriteria || ''}\n\nService/Product Criteria: ${criteria.serviceCriteria || ''}\n\nGeography Criteria: ${criteria.geographyCriteria || ''}\n\nBuyer Types: ${criteria.buyerTypesCriteria || ''}`;
                      
                      supabase.functions.invoke('parse-fit-criteria', {
                        body: { fit_criteria: criteriaText }
                      }).then(async ({ data: parsedData, error: parseError }) => {
                        if (parseError || !parsedData?.success) {
                          console.error('[AIResearchSection] Failed to parse criteria for DB:', parseError || parsedData?.error);
                          return;
                        }
                        
                        const { error: updateError } = await supabase
                          .from("industry_trackers")
                          .update({
                            size_criteria: parsedData.size_criteria,
                            service_criteria: parsedData.service_criteria,
                            geography_criteria: parsedData.geography_criteria,
                            buyer_types_criteria: parsedData.buyer_types_criteria,
                            updated_at: new Date().toISOString()
                          })
                          .eq("id", trackerId);
                          
                        if (!updateError) {
                          console.log('[AIResearchSection] Criteria saved to database successfully');
                          toast({ title: "Criteria saved", description: "Buyer fit criteria stored in database" });
                        } else {
                          console.error('[AIResearchSection] Failed to save criteria:', updateError);
                        }
                      });
                    }
                  }
                }
                break;
              case "complete":
                setState("complete");
                setOverallProgress(100);
                if (parsed.quality) {
                  console.log('[AIResearchSection] Complete quality:', parsed.quality);
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
    
    // Check validation blockers
    if (criteriaValidation.preSaveResult && !criteriaValidation.preSaveResult.canSave) {
      toast({ 
        title: "Cannot Apply Criteria", 
        description: criteriaValidation.preSaveResult.blockers[0] || "Validation failed",
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
      excludedServices: extractedCriteria.excludedServices,
      validationScore: criteriaValidation.validation?.overallScore
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
    const validationStatus = criteriaValidation.validation?.status || 'unknown';
    
    // Show warning if partial
    if (validationStatus === 'partial') {
      toast({ 
        title: "Criteria Applied (Partial)", 
        description: `${foundCount}/4 sections extracted. ${primaryCount} primary focus. Some fields may need review.`,
        variant: "default"
      });
    } else {
      toast({ 
        title: "Criteria Applied!", 
        description: `${foundCount}/4 sections extracted. ${primaryCount} primary focus service${primaryCount !== 1 ? 's' : ''}.` 
      });
    }
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
    setIsFixing(false);
    setFixingIssue("");
    setFixProgress({ current: 0, total: 0 });
    setAcceptedAnyway(false);
  };

  // Accept guide despite quality issues
  const acceptAnyway = () => {
    setAcceptedAnyway(true);
    toast({ 
      title: "Guide Accepted", 
      description: "You've accepted the guide despite quality warnings. Criteria has been applied." 
    });
  };

  // Fix specific issues using targeted gap-filling
  const fixIssues = async (issuesToFix: string[]) => {
    if (!guideContent || issuesToFix.length === 0) return;
    
    setIsFixing(true);
    setState("fixing");
    setFixProgress({ current: 0, total: issuesToFix.length });
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ma-guide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          industryName,
          fixMode: true,
          issues: issuesToFix,
          existingContent: guideContent
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = "";
      let newContent = guideContent;

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
              case "fix_start":
                toast({ title: "Fixing issues", description: `Addressing ${parsed.issues?.length || 0} quality issues...` });
                break;
              case "fix_progress":
                setFixProgress({ current: parsed.current, total: parsed.total });
                setFixingIssue(parsed.issue || "");
                break;
              case "fix_content":
                newContent += parsed.content || "";
                setGuideContent(newContent);
                toast({ 
                  title: `Fixed: ${parsed.issue?.slice(0, 40)}...`, 
                  description: `Added ${parsed.wordCount?.toLocaleString()} words` 
                });
                break;
              case "fix_warning":
                toast({ title: "Warning", description: parsed.message, variant: "destructive" });
                break;
              case "fix_complete":
                setQualityResult(parsed.quality);
                if (parsed.criteria) {
                  setExtractedCriteria(parsed.criteria);
                  // Auto-apply fixed criteria
                  if (parsed.criteria.sizeCriteria || parsed.criteria.serviceCriteria) {
                    onApply({
                      sizeCriteria: parsed.criteria.sizeCriteria || "",
                      serviceCriteria: parsed.criteria.serviceCriteria || "",
                      geographyCriteria: parsed.criteria.geographyCriteria || "",
                      buyerTypesCriteria: parsed.criteria.buyerTypesCriteria || "",
                      primaryFocusServices: parsed.criteria.primaryFocusServices || [],
                      excludedServices: parsed.criteria.excludedServices || [],
                    });
                  }
                }
                toast({ 
                  title: "Issues fixed!", 
                  description: `New score: ${parsed.quality?.score}/100. ${parsed.wordCount?.toLocaleString()} total words.` 
                });
                break;
              case "error":
                toast({ title: "Fix failed", description: parsed.message, variant: "destructive" });
                break;
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      setState("complete");
    } catch (err) {
      console.error('Fix issues error:', err);
      toast({ 
        title: "Fix failed", 
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive" 
      });
      setState("complete");
    } finally {
      setIsFixing(false);
      setFixingIssue("");
      setFixProgress({ current: 0, total: 0 });
    }
  };

  const fixSingleIssue = (issue: string) => {
    fixIssues([issue]);
  };

  const fixAllIssues = () => {
    if (qualityResult?.issues) {
      fixIssues(qualityResult.issues);
    }
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

  const isGenerating = state === "generating" || state === "quality_check" || state === "gap_filling" || state === "fixing";

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
                       state === "fixing" ? `Fixing: ${fixingIssue.slice(0, 50)}${fixingIssue.length > 50 ? '...' : ''} (${fixProgress.current}/${fixProgress.total})` :
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
                {/* Prominent Alert Banner for Quality Issues */}
                {qualityResult && !qualityResult.passed && !acceptedAnyway && (
                  <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="text-yellow-700 dark:text-yellow-400">Quality Issues Detected</AlertTitle>
                    <AlertDescription className="text-yellow-600 dark:text-yellow-300">
                      {qualityResult.issues && qualityResult.issues.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {qualityResult.issues.slice(0, 5).map((issue, i) => (
                            <div key={i} className="text-sm">• {issue}</div>
                          ))}
                          {qualityResult.issues.length > 5 && (
                            <div className="text-sm text-muted-foreground">...and {qualityResult.issues.length - 5} more issues</div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm">
                          Score: {qualityResult.score}/100 (requires 70+ to pass).
                          {!qualityResult.hasCriteria && " Missing BUYER FIT CRITERIA section."}
                          {!qualityResult.hasBuyerTypes && " Missing BUYER TYPES section."}
                          {qualityResult.missingElements?.length > 0 && ` Missing: ${qualityResult.missingElements.join(', ')}`}
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={fixAllIssues}
                          disabled={isFixing}
                          className="gap-1 text-xs border-yellow-500/30 text-yellow-700 hover:bg-yellow-500/10"
                        >
                          {isFixing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                          Fix All Issues
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={acceptAnyway}
                          className="gap-1 text-xs text-yellow-700 hover:bg-yellow-500/10"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          Accept Anyway
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Accepted Anyway Confirmation */}
                {acceptedAnyway && !qualityResult?.passed && (
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-700 dark:text-green-400">Guide Accepted</AlertTitle>
                    <AlertDescription className="text-green-600 dark:text-green-300 text-sm">
                      You've accepted this guide despite quality warnings. The criteria has been applied.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {qualityResult?.passed || acceptedAnyway ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    )}
                    <span className="font-medium">
                      {qualityResult?.passed ? "M&A Guide Generated" : acceptedAnyway ? "M&A Guide Accepted" : "Guide Generated (Quality Issues)"}
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

                {/* Detailed Issues List with Individual Fix Buttons */}
                {qualityResult?.issues && qualityResult.issues.length > 0 && !acceptedAnyway && (
                  <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-yellow-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        All Quality Issues ({qualityResult.issues.length})
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={fixAllIssues}
                        disabled={isFixing}
                        className="gap-1 text-xs h-7 border-yellow-500/30 text-yellow-700 hover:bg-yellow-500/10"
                      >
                        {isFixing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        Fix All Issues
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {qualityResult.issues.map((issue, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 p-2 bg-background/50 rounded text-xs">
                          <span className="text-muted-foreground flex-1">{issue}</span>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => fixSingleIssue(issue)}
                            disabled={isFixing}
                            className="h-6 px-2 text-xs hover:bg-yellow-500/10"
                          >
                            {isFixing && fixingIssue === issue ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <Wand2 className="w-3 h-3 mr-1" />
                                Fix
                              </>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
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
                    
                    {/* Validation Alert */}
                    {criteriaValidation.validation && (
                      <CriteriaValidationAlert 
                        validation={criteriaValidation.validation} 
                        onFixRequest={(field) => {
                          toast({
                            title: `Missing: ${field.replace(/_/g, ' ')}`,
                            description: "Try regenerating or manually adding this field in Tracker settings.",
                          });
                        }}
                      />
                    )}
                    
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

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={reset} className="gap-1">
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadAsDoc} className="gap-1">
                    <Download className="w-3 h-3" />
                    Download .docx
                  </Button>
                  {qualityResult?.issues && qualityResult.issues.length > 0 && !qualityResult.passed && !acceptedAnyway && (
                    <>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={fixAllIssues}
                        disabled={isFixing}
                        className="gap-1"
                      >
                        {isFixing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        Fix Issues
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={acceptAnyway}
                        className="gap-1"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        Accept Anyway
                      </Button>
                    </>
                  )}
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
