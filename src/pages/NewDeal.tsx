import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Sparkles, Wand2 } from "lucide-react";
import { normalizeGeography } from "@/lib/normalizeGeography";
import { normalizeDomain } from "@/lib/normalizeDomain";
import { useCompanyLookup } from "@/hooks/useCompanyLookup";
import { CompanyExistsCard } from "@/components/CompanyExistsCard";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

export default function NewDeal() {
  const { trackerId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generalNotes, setGeneralNotes] = useState("");
  const [tracker, setTracker] = useState<any>(null);
  const [form, setForm] = useState({
    deal_name: "",
    company_website: "",
    geography: "",
    revenue: "",
    ebitda_percentage: "",
    service_mix: "",
    owner_goals: "",
    additional_info: "",
    transcript_link: "",
    location_count: "1"
  });

  const { isLookingUp, existingCompany, dealHistory, lookupByDomain, clearLookup } = useCompanyLookup();

  useEffect(() => {
    supabase.from("industry_trackers").select("*").eq("id", trackerId).single().then(({ data }) => setTracker(data));
  }, [trackerId]);

  // Debounced domain lookup when website changes
  const debouncedLookup = useDebouncedCallback((website: string) => {
    if (website.trim()) {
      lookupByDomain(website);
    } else {
      clearLookup();
    }
  }, 500);

  const handleWebsiteChange = (value: string) => {
    setForm({ ...form, company_website: value });
    debouncedLookup(value);
  };

  // Check if already in this tracker
  const alreadyInThisTracker = dealHistory.some((d) => d.tracker_id === trackerId);

  const [extractionStatus, setExtractionStatus] = useState<string | null>(null);

  const handleAnalyzeNotes = async () => {
    if (!generalNotes.trim()) {
      toast({ title: "No notes to analyze", description: "Please paste your notes first.", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-deal-notes', {
        body: { notes: generalNotes }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Analysis failed');
      }

      const extracted = data.data;
      console.log('Extracted data:', extracted);

      // Update form with extracted data, preserving existing values if extraction didn't find anything
      setForm(prev => ({
        ...prev,
        deal_name: extracted.deal_name || prev.deal_name,
        company_website: extracted.company_website || prev.company_website,
        geography: extracted.geography?.join(', ') || prev.geography,
        revenue: extracted.revenue?.toString() || prev.revenue,
        ebitda_percentage: extracted.ebitda_percentage?.toString() || prev.ebitda_percentage,
        service_mix: extracted.service_mix || prev.service_mix,
        owner_goals: extracted.owner_goals || prev.owner_goals,
        additional_info: extracted.additional_info || prev.additional_info,
        location_count: extracted.location_count?.toString() || prev.location_count,
      }));

      // Trigger website lookup if we got a website
      if (extracted.company_website) {
        debouncedLookup(extracted.company_website);
      }

      const fieldsFound = Object.values(extracted).filter(v => v !== null && v !== undefined && v !== '').length;
      toast({ 
        title: "Notes analyzed!", 
        description: `Extracted ${fieldsFound} fields from your notes.` 
      });
    } catch (err) {
      console.error('Analysis failed:', err);
      toast({ 
        title: "Analysis failed", 
        description: err instanceof Error ? err.message : "Could not analyze notes.", 
        variant: "destructive" 
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.deal_name.trim()) return;
    
    // Prevent duplicate in same tracker
    if (alreadyInThisTracker) {
      toast({ 
        title: "Already Listed", 
        description: "This company is already listed in this buyer universe.", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    
    const domain = normalizeDomain(form.company_website);
    const normalizedGeography = normalizeGeography(form.geography);

    // Track which fields came from notes analysis
    const notesExtractedFields: string[] = [];
    if (form.deal_name) notesExtractedFields.push('deal_name');
    if (form.geography) notesExtractedFields.push('geography');
    if (form.revenue) notesExtractedFields.push('revenue');
    if (form.ebitda_percentage) notesExtractedFields.push('ebitda_percentage');
    if (form.service_mix) notesExtractedFields.push('service_mix');
    if (form.owner_goals) notesExtractedFields.push('owner_goals');
    if (form.location_count && form.location_count !== "1") notesExtractedFields.push('location_count');

    // Build initial extraction_sources if we have notes data
    const initialSources = notesExtractedFields.length > 0 ? [{
      source: 'notes',
      timestamp: new Date().toISOString(),
      fields: notesExtractedFields
    }] : [];

    try {
      let companyId: string;

      if (existingCompany) {
        // Use existing company
        companyId = existingCompany.id;
        toast({ title: "Using Existing Company", description: "Linking to existing company record." });
      } else {
        // Create new company
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
          toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const { data: newCompany, error: companyError } = await supabase
          .from("companies")
          .insert({
            user_id: user.user.id,
            domain: domain || `manual-${Date.now()}`, // Fallback for companies without websites
            company_name: form.deal_name,
            company_website: form.company_website || null,
            industry_type: tracker?.industry_name,
            geography: normalizedGeography.length > 0 ? normalizedGeography : null,
            revenue: form.revenue ? parseFloat(form.revenue) : null,
            ebitda_percentage: form.ebitda_percentage ? parseFloat(form.ebitda_percentage) : null,
            service_mix: form.service_mix,
            owner_goals: form.owner_goals,
            additional_info: form.additional_info,
            transcript_link: form.transcript_link || null,
            location_count: parseInt(form.location_count) || 1,
          })
          .select()
          .single();

        if (companyError) {
          toast({ title: "Error", description: companyError.message, variant: "destructive" });
          setIsLoading(false);
          return;
        }
        companyId = newCompany.id;
      }

      // Create deal (linking to company) with notes-sourced extraction_sources
      const { data: dealData, error: dealError } = await supabase.from("deals").insert({
        tracker_id: trackerId,
        company_id: companyId,
        deal_name: form.deal_name,
        company_website: form.company_website || null,
        industry_type: tracker?.industry_name,
        geography: normalizedGeography.length > 0 ? normalizedGeography : null,
        revenue: form.revenue ? parseFloat(form.revenue) : null,
        ebitda_percentage: form.ebitda_percentage ? parseFloat(form.ebitda_percentage) : null,
        service_mix: form.service_mix,
        owner_goals: form.owner_goals,
        additional_info: form.additional_info,
        transcript_link: form.transcript_link || null,
        location_count: parseInt(form.location_count) || 1,
        extraction_sources: initialSources, // Mark notes-sourced fields
      }).select().single();
      
      if (dealError) { 
        toast({ title: "Error", description: dealError.message, variant: "destructive" }); 
        setIsLoading(false); 
        return; 
      }

      // DATA PRIORITY ORDER: Transcript > Notes > Website
      // Step 1: If transcript link provided, extract info FIRST (highest priority)
      let transcriptSucceeded = false;
      if (form.transcript_link) {
        setExtractionStatus("Extracting from transcript...");
        try {
          const { data: extractionResult, error: extractionError } = await supabase.functions.invoke('extract-deal-transcript', {
            body: { dealId: dealData.id }
          });
          
          if (extractionError) {
            console.error('Extraction error:', extractionError);
            toast({ 
              title: "Deal created", 
              description: "Transcript extraction failed, but you can retry from the deal page." 
            });
          } else if (extractionResult?.success) {
            transcriptSucceeded = true;
            const followupNote = extractionResult.hasFollowupQuestions ? " Some data needs clarification." : "";
            toast({ 
              title: "Deal listed!", 
              description: `Extracted ${extractionResult.extractedFields?.length || 0} fields from transcript.${followupNote}` 
            });
          } else {
            toast({ 
              title: "Deal created", 
              description: extractionResult?.error || "Extraction incomplete, you can retry from the deal page." 
            });
          }
        } catch (err) {
          console.error('Extraction failed:', err);
          toast({ title: "Deal created", description: "Transcript extraction failed." });
        }
      }

      // Step 2: If website provided, enrich LAST (lowest priority - will not overwrite transcript/notes data)
      if (form.company_website) {
        setExtractionStatus("Enriching from website...");
        try {
          const { data: enrichResult, error: enrichError } = await supabase.functions.invoke('enrich-deal', {
            body: { dealId: dealData.id, onlyFillEmpty: true }
          });
          
          if (enrichError) {
            console.error('Website enrichment error:', enrichError);
          } else if (enrichResult?.success && enrichResult.updatedFields?.length > 0) {
            console.log(`Enriched ${enrichResult.updatedFields.length} fields from website`);
            // Only show toast if transcript didn't run (to avoid duplicate toasts)
            if (!form.transcript_link) {
              toast({ title: "Deal listed!", description: "Enriched with data from website." });
            }
          }
        } catch (err) {
          console.error('Website enrichment failed:', err);
        }
      }

      // Show generic success if no extraction ran
      if (!form.transcript_link && !form.company_website) {
        toast({ title: "Deal listed!" });
      }

      navigate(`/deals/${dealData.id}`);
    } catch (err) {
      console.error('Failed to create deal:', err);
      toast({ title: "Error", description: "Failed to create deal.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        <h1 className="text-2xl font-display font-bold mb-2">List New Deal</h1>
        <p className="text-muted-foreground mb-6">in {tracker?.industry_name || "..."}</p>
        
        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-lg border p-6">
          {/* General Notes Section */}
          <div className="bg-muted/50 rounded-lg p-4 border border-dashed">
            <Label className="flex items-center gap-2 text-base font-medium mb-2">
              <Wand2 className="w-4 h-4 text-primary" />
              Quick Fill from Notes
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              Paste any notes, emails, or call summaries about this deal and AI will extract the relevant information.
            </p>
            <Textarea 
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Paste your notes here... e.g., 'Spoke with John from ABC Roofing in Atlanta, GA. They do about $5M in revenue with 20% margins. Has 3 locations across Georgia. Looking to retire in 2-3 years...'"
              className="min-h-[120px] bg-background"
            />
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleAnalyzeNotes}
              disabled={isAnalyzing || !generalNotes.trim()}
              className="mt-3"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze & Fill Fields
                </>
              )}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or fill manually</span>
            </div>
          </div>

          <div><Label>Deal Name *</Label><Input value={form.deal_name} onChange={(e) => setForm({ ...form, deal_name: e.target.value })} placeholder="e.g., Southeast Roofing Co." className="mt-1" /></div>
          
          <div>
            <Label>Company Website</Label>
            <Input 
              type="url" 
              value={form.company_website} 
              onChange={(e) => handleWebsiteChange(e.target.value)} 
              placeholder="e.g., https://example.com" 
              className="mt-1" 
            />
            {isLookingUp && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking for existing company...
              </p>
            )}
          </div>

          {/* Show existing company card */}
          {existingCompany && (
            <CompanyExistsCard company={existingCompany} dealHistory={dealHistory} />
          )}

          {/* Warning if already in this tracker */}
          {alreadyInThisTracker && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive">
              This company is already listed in this buyer universe. You can view the existing deal instead.
            </div>
          )}

          <div><Label>Geography (2-letter state codes, comma-separated)</Label><Input value={form.geography} onChange={(e) => setForm({ ...form, geography: e.target.value })} placeholder="e.g., GA, FL, SC or Georgia, Florida" className="mt-1" /><p className="text-xs text-muted-foreground mt-1">Accepts state names, abbreviations, or "City, State" format</p></div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Revenue ($M)</Label><Input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} placeholder="e.g., 6.5" className="mt-1" /></div>
            <div><Label>EBITDA (%)</Label><Input type="number" value={form.ebitda_percentage} onChange={(e) => setForm({ ...form, ebitda_percentage: e.target.value })} placeholder="e.g., 23" className="mt-1" /></div>
            <div>
              <Label>Number of Locations</Label>
              <Select value={form.location_count} onValueChange={(v) => setForm({ ...form, location_count: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 (Single location)</SelectItem>
                  <SelectItem value="2">2 locations</SelectItem>
                  <SelectItem value="3">3 locations</SelectItem>
                  <SelectItem value="4">4 locations</SelectItem>
                  <SelectItem value="5">5+ locations</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Single-location deals require buyer within 100 miles</p>
            </div>
          </div>
          <div><Label>Service Mix</Label><Textarea value={form.service_mix} onChange={(e) => setForm({ ...form, service_mix: e.target.value })} placeholder="Describe services/products offered..." className="mt-1" /></div>
          <div><Label>Goals of Owner</Label><Textarea value={form.owner_goals} onChange={(e) => setForm({ ...form, owner_goals: e.target.value })} placeholder="What the owner wants from the sale..." className="mt-1" /></div>
          <div><Label>Additional Information</Label><Textarea value={form.additional_info} onChange={(e) => setForm({ ...form, additional_info: e.target.value })} placeholder="Any other relevant details..." className="mt-1" /></div>
          <div>
            <Label>Transcript Link</Label>
            <Input type="url" value={form.transcript_link} onChange={(e) => setForm({ ...form, transcript_link: e.target.value })} placeholder="Link to call transcript (e.g., Fireflies.ai)" className="mt-1" />
            {form.transcript_link && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI will extract company info from transcript
              </p>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={isLoading || !form.deal_name.trim() || alreadyInThisTracker} 
            className="w-full"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {extractionStatus || (existingCompany ? "Add to This Buyer Universe" : "List Deal & Match Buyers")}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
