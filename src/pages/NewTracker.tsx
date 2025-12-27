import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, DollarSign, Briefcase, MapPin, Users, Check, AlertTriangle } from "lucide-react";
import { TrackerNotesSection } from "@/components/TrackerNotesSection";
import { DocumentUploadSection, UploadedDoc } from "@/components/DocumentUploadSection";
import { AIResearchSection, UploadedGuideDoc } from "@/components/AIResearchSection";

interface ExtractedCriteria {
  sizeCriteria: string;
  serviceCriteria: string;
  geographyCriteria: string;
  buyerTypesCriteria: string;
  primaryFocusServices: string[];
  excludedServices: string[];
}

export default function NewTracker() {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [extractedCriteria, setExtractedCriteria] = useState<ExtractedCriteria>({
    sizeCriteria: "",
    serviceCriteria: "",
    geographyCriteria: "",
    buyerTypesCriteria: "",
    primaryFocusServices: [],
    excludedServices: [],
  });
  const [pendingGuide, setPendingGuide] = useState<{ content: string; qaContext: Record<string, string> } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleApplyCriteria = (data: {
    industryName?: string;
    sizeCriteria: string;
    serviceCriteria: string;
    geographyCriteria: string;
    buyerTypesCriteria: string;
    primaryFocusServices?: string[];
    excludedServices?: string[];
  }) => {
    if (data.industryName && !name.trim()) {
      setName(data.industryName);
    }
    setExtractedCriteria(prev => ({
      sizeCriteria: data.sizeCriteria ? (prev.sizeCriteria ? `${prev.sizeCriteria}\n${data.sizeCriteria}` : data.sizeCriteria) : prev.sizeCriteria,
      serviceCriteria: data.serviceCriteria ? (prev.serviceCriteria ? `${prev.serviceCriteria}\n${data.serviceCriteria}` : data.serviceCriteria) : prev.serviceCriteria,
      geographyCriteria: data.geographyCriteria ? (prev.geographyCriteria ? `${prev.geographyCriteria}\n${data.geographyCriteria}` : data.geographyCriteria) : prev.geographyCriteria,
      buyerTypesCriteria: data.buyerTypesCriteria ? (prev.buyerTypesCriteria ? `${prev.buyerTypesCriteria}\n${data.buyerTypesCriteria}` : data.buyerTypesCriteria) : prev.buyerTypesCriteria,
      // Merge arrays, avoiding duplicates
      primaryFocusServices: data.primaryFocusServices?.length 
        ? [...new Set([...prev.primaryFocusServices, ...data.primaryFocusServices])]
        : prev.primaryFocusServices,
      excludedServices: data.excludedServices?.length
        ? [...new Set([...prev.excludedServices, ...data.excludedServices])]
        : prev.excludedServices,
    }));
  };

  const handleGuideGenerated = (guide: string, qaContext: Record<string, string>) => {
    setPendingGuide({ content: guide, qaContext });
  };

  const handleGuideDocumentUploaded = (doc: UploadedGuideDoc) => {
    // Add the uploaded guide to the documents list
    setUploadedDocs(prev => [...prev, doc]);
    toast({ 
      title: "Guide saved as document", 
      description: `${doc.name} added to supporting documents` 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create a buyer universe", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    // Combine all criteria text for legacy fit_criteria field
    const combinedCriteria = [
      extractedCriteria.sizeCriteria && `Size: ${extractedCriteria.sizeCriteria}`,
      extractedCriteria.serviceCriteria && `Service: ${extractedCriteria.serviceCriteria}`,
      extractedCriteria.geographyCriteria && `Geography: ${extractedCriteria.geographyCriteria}`,
      extractedCriteria.buyerTypesCriteria && `Buyer Types: ${extractedCriteria.buyerTypesCriteria}`
    ].filter(Boolean).join('\n\n');
    
    const insertData: Record<string, unknown> = { 
      industry_name: name.trim(), 
      user_id: user.id,
      fit_criteria: combinedCriteria || null,
      fit_criteria_size: extractedCriteria.sizeCriteria.trim() || null,
      fit_criteria_service: extractedCriteria.serviceCriteria.trim() || null,
      fit_criteria_geography: extractedCriteria.geographyCriteria.trim() || null,
      fit_criteria_buyer_types: extractedCriteria.buyerTypesCriteria.trim() || null,
      documents: uploadedDocs.length > 0 ? uploadedDocs : null,
    };

    // Add M&A guide if generated
    if (pendingGuide) {
      insertData.ma_guide_content = pendingGuide.content;
      insertData.ma_guide_generated_at = new Date().toISOString();
      insertData.ma_guide_qa_context = pendingGuide.qaContext;
    }

    const { data, error } = await supabase
      .from("industry_trackers")
      .insert(insertData as any)
      .select()
      .single();
      
    if (error) { 
      toast({ title: "Error", description: error.message, variant: "destructive" }); 
      setIsLoading(false); 
      return; 
    }

    // DIRECT SAVE: If we have primaryFocusServices from AI extraction, save them directly
    // This avoids double-parsing which can lose data
    if (extractedCriteria.primaryFocusServices?.length) {
      console.log('[NewTracker] Saving primaryFocusServices directly:', extractedCriteria.primaryFocusServices);
      
      await supabase
        .from("industry_trackers")
        .update({
          service_criteria: {
            primary_focus: extractedCriteria.primaryFocusServices,
            excluded_services: extractedCriteria.excludedServices || [],
          },
        })
        .eq("id", data.id);
    }

    // Parse remaining text criteria into structured JSONB fields
    const hasCriteria = extractedCriteria.sizeCriteria.trim() || extractedCriteria.serviceCriteria.trim() || extractedCriteria.geographyCriteria.trim() || extractedCriteria.buyerTypesCriteria.trim();
    if (hasCriteria) {
      try {
        const criteriaText = `Size Criteria: ${extractedCriteria.sizeCriteria}\n\nService/Product Criteria: ${extractedCriteria.serviceCriteria}\n\nGeography Criteria: ${extractedCriteria.geographyCriteria}\n\nBuyer Types: ${extractedCriteria.buyerTypesCriteria}`;
        const { data: parsedData } = await supabase.functions.invoke('parse-fit-criteria', {
          body: { fit_criteria: criteriaText }
        });

        if (parsedData?.success) {
          // Merge parsed service_criteria BUT preserve directly extracted primaryFocusServices
          const existingPrimaryFocus = extractedCriteria.primaryFocusServices || [];
          const existingExcluded = extractedCriteria.excludedServices || [];
          
          const serviceCriteria = {
            ...parsedData.service_criteria,
            // CRITICAL: Prefer directly extracted values over re-parsed ones
            primary_focus: existingPrimaryFocus.length > 0 
              ? existingPrimaryFocus 
              : (parsedData.service_criteria?.primary_focus || []),
            excluded_services: existingExcluded.length > 0
              ? existingExcluded
              : (parsedData.service_criteria?.excluded_services || []),
          };
          
          await supabase
            .from("industry_trackers")
            .update({
              size_criteria: parsedData.size_criteria,
              service_criteria: serviceCriteria,
              geography_criteria: parsedData.geography_criteria,
              buyer_types_criteria: parsedData.buyer_types_criteria,
            })
            .eq("id", data.id);
            
          console.log('[NewTracker] Saved merged service_criteria with primary_focus:', serviceCriteria.primary_focus);
          
          // Validation check: warn if primary_focus is still empty
          if (!serviceCriteria.primary_focus?.length) {
            toast({ 
              title: "Warning: Missing Primary Focus", 
              description: "No primary services defined. Deal scoring may be inaccurate. Consider editing criteria.",
              variant: "destructive"
            });
          }
        }
      } catch (err) {
        console.error('[NewTracker] Failed to parse criteria:', err);
        // Silently continue - structured criteria is optional
      }
    }

    // If documents were uploaded, trigger document analysis in the background
    if (uploadedDocs.length > 0) {
      toast({ title: "Success", description: `${name} created! Analyzing documents...` });
      
      // Fire off document analysis (don't await - let it run in background)
      supabase.functions.invoke('parse-tracker-documents', {
        body: { tracker_id: data.id }
      }).then(({ data: analysisData, error: analysisError }) => {
        if (analysisError || !analysisData?.success) {
          console.error('Document analysis failed:', analysisError || analysisData?.error);
        }
      });
    } else {
      toast({ title: "Success", description: `${name} buyer universe created!` });
    }

    navigate(`/trackers/${data.id}`);
  };

  const hasCriteria = extractedCriteria.sizeCriteria || extractedCriteria.serviceCriteria || extractedCriteria.geographyCriteria || extractedCriteria.buyerTypesCriteria;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
        <h1 className="text-2xl font-display font-bold mb-2">Create Buyer Universe</h1>
        <p className="text-muted-foreground mb-6">Define a new industry vertical for buyer-deal matching.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Industry Name */}
          <div className="bg-card rounded-lg border p-4">
            <Label htmlFor="name" className="text-sm font-medium">Industry Name</Label>
            <Input 
              id="name" 
              placeholder="e.g., Residential Roofing, Collision Repair" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="mt-1.5" 
            />
          </div>

          {/* Three Input Methods */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choose how to populate buyer fit criteria:</p>
            
            <TrackerNotesSection onApply={handleApplyCriteria} />
            
            <DocumentUploadSection 
              uploadedDocs={uploadedDocs} 
              onDocsChange={setUploadedDocs} 
            />
            
            <AIResearchSection 
              industryName={name}
              onApply={handleApplyCriteria}
              onGuideGenerated={handleGuideGenerated}
              onGuideDocumentUploaded={handleGuideDocumentUploaded}
            />
          </div>

          {/* Extracted Criteria Preview */}
          {hasCriteria && (
            <div className="bg-card rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <Label className="text-sm font-medium">Extracted Criteria Preview</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {extractedCriteria.sizeCriteria && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <DollarSign className="w-3 h-3" />
                      Size Criteria
                    </div>
                    <p className="text-sm whitespace-pre-line line-clamp-3">{extractedCriteria.sizeCriteria}</p>
                  </div>
                )}
                {extractedCriteria.serviceCriteria && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Briefcase className="w-3 h-3" />
                      Service Mix
                    </div>
                    <p className="text-sm whitespace-pre-line line-clamp-3">{extractedCriteria.serviceCriteria}</p>
                  </div>
                )}
                {extractedCriteria.geographyCriteria && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <MapPin className="w-3 h-3" />
                      Geography
                    </div>
                    <p className="text-sm whitespace-pre-line line-clamp-3">{extractedCriteria.geographyCriteria}</p>
                  </div>
                )}
                {extractedCriteria.buyerTypesCriteria && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Users className="w-3 h-3" />
                      Buyer Types
                    </div>
                    <p className="text-sm whitespace-pre-line line-clamp-3">{extractedCriteria.buyerTypesCriteria}</p>
                  </div>
                )}
              </div>

              {pendingGuide && (
                <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-lg">
                  <Check className="w-3 h-3" />
                  M&A Guide will be saved with this universe
                </div>
              )}
              
              {/* Primary Focus Services Preview */}
              {extractedCriteria.primaryFocusServices.length > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                  <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 mb-2">
                    <Check className="w-3 h-3" />
                    Primary Focus Services ({extractedCriteria.primaryFocusServices.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {extractedCriteria.primaryFocusServices.map((service, idx) => (
                      <span key={idx} className="text-xs bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Warning if no primary focus extracted */}
              {hasCriteria && extractedCriteria.primaryFocusServices.length === 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900">
                  <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="w-3 h-3" />
                    No primary focus services extracted. Deal scoring may be less accurate.
                  </div>
                </div>
              )}
            </div>
          )}

          <Button type="submit" disabled={isLoading || !name.trim()} className="w-full">
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Universe
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
