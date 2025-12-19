import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Users, ExternalLink, FileText, Calendar, Building2, DollarSign, MapPin, Target, User, Phone, Mail, Briefcase, Clock, Hash, Linkedin, Sparkles, AlertTriangle, MessageSquareWarning, Store, Globe, Pencil, Save, X } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { FollowupQuestionsPanel } from "@/components/FollowupQuestionsPanel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deal, setDeal] = useState<any>(null);
  const [tracker, setTracker] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [originalData, setOriginalData] = useState<any>({});

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const { data: dealData } = await supabase.from("deals").select("*").eq("id", id).maybeSingle();
    setDeal(dealData);
    if (dealData) {
      const { data: trackerData } = await supabase.from("industry_trackers").select("*").eq("id", dealData.tracker_id).maybeSingle();
      setTracker(trackerData);
    }
    setIsLoading(false);
  };

  const handleExtractTranscript = async () => {
    if (!deal?.transcript_link) {
      toast({ title: "No transcript", description: "This deal has no transcript link.", variant: "destructive" });
      return;
    }
    
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-deal-transcript', {
        body: { dealId: id }
      });
      
      if (error) {
        toast({ title: "Extraction failed", description: error.message, variant: "destructive" });
      } else if (data?.success) {
        const followupNote = data.hasFollowupQuestions ? " Some data needs clarification." : "";
        toast({ 
          title: "Extraction complete", 
          description: `Updated ${data.extractedFields?.length || 0} fields from transcript.${followupNote}` 
        });
        await loadData();
      } else {
        toast({ title: "Extraction failed", description: data?.error || "Unknown error", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Extraction failed", description: "Failed to extract transcript", variant: "destructive" });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleEnrichFromWebsite = async () => {
    if (!deal?.company_website) {
      toast({ title: "No website", description: "This deal has no company website.", variant: "destructive" });
      return;
    }
    
    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-deal', {
        body: { dealId: id, onlyFillEmpty: true }
      });
      
      if (error) {
        toast({ title: "Enrichment failed", description: error.message, variant: "destructive" });
      } else if (data?.success) {
        const fieldsUpdated = data.updatedFields?.length || 0;
        if (fieldsUpdated > 0) {
          toast({ 
            title: "Enrichment complete", 
            description: `Updated ${fieldsUpdated} fields from website: ${data.updatedFields.join(', ')}` 
          });
          await loadData();
        } else {
          toast({ 
            title: "No new data", 
            description: "All fields already have data. Website info would not add anything new." 
          });
        }
      } else {
        toast({ title: "Enrichment failed", description: data?.error || "Unknown error", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Enrichment failed", description: "Failed to enrich from website", variant: "destructive" });
    } finally {
      setIsEnriching(false);
    }
  };

  const handleStartEdit = () => {
    const data = {
      company_website: deal.company_website || '',
      transcript_link: deal.transcript_link || '',
      headquarters: deal.headquarters || '',
      founded_year: deal.founded_year || '',
      employee_count: deal.employee_count || '',
      industry_type: deal.industry_type || '',
      location_count: deal.location_count || '',
      revenue: deal.revenue || '',
      ebitda_percentage: deal.ebitda_percentage || '',
      company_overview: deal.company_overview || '',
      service_mix: deal.service_mix || '',
      business_model: deal.business_model || '',
      geography: deal.geography?.join(', ') || '',
      owner_goals: deal.owner_goals || '',
      special_requirements: deal.special_requirements || '',
      ownership_structure: deal.ownership_structure || '',
      contact_name: deal.contact_name || '',
      contact_email: deal.contact_email || '',
      contact_phone: deal.contact_phone || '',
      contact_linkedin: deal.contact_linkedin || '',
      additional_info: deal.additional_info || '',
    };
    setEditData(data);
    setOriginalData(data);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({});
    setOriginalData({});
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Parse geography from comma-separated string
      const geographyArray = editData.geography 
        ? editData.geography.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean)
        : null;

      const updatePayload: any = {
        company_website: editData.company_website || null,
        transcript_link: editData.transcript_link || null,
        headquarters: editData.headquarters || null,
        founded_year: editData.founded_year ? parseInt(editData.founded_year) : null,
        employee_count: editData.employee_count ? parseInt(editData.employee_count) : null,
        industry_type: editData.industry_type || null,
        location_count: editData.location_count ? parseInt(editData.location_count) : null,
        revenue: editData.revenue ? parseFloat(editData.revenue) : null,
        ebitda_percentage: editData.ebitda_percentage ? parseFloat(editData.ebitda_percentage) : null,
        company_overview: editData.company_overview || null,
        service_mix: editData.service_mix || null,
        business_model: editData.business_model || null,
        geography: geographyArray,
        owner_goals: editData.owner_goals || null,
        special_requirements: editData.special_requirements || null,
        ownership_structure: editData.ownership_structure || null,
        contact_name: editData.contact_name || null,
        contact_email: editData.contact_email || null,
        contact_phone: editData.contact_phone || null,
        contact_linkedin: editData.contact_linkedin || null,
        additional_info: editData.additional_info || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("deals").update(updatePayload).eq("id", id);
      
      if (error) {
        toast({ title: "Save failed", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "Deal updated", description: "Changes saved successfully." });
      setIsEditing(false);

      // Check if transcript link was just added
      const transcriptWasAdded = !originalData.transcript_link && editData.transcript_link;
      // Check if website was just added
      const websiteWasAdded = !originalData.company_website && editData.company_website;

      // Reload data first
      await loadData();

      // Auto-enrich from website if it was just added (runs first, fills empty)
      if (websiteWasAdded) {
        toast({ title: "Auto-enriching", description: "Enriching deal from website..." });
        setIsEnriching(true);
        try {
          const { data } = await supabase.functions.invoke('enrich-deal', {
            body: { dealId: id, onlyFillEmpty: true }
          });
          if (data?.success && data?.updatedFields?.length > 0) {
            toast({ title: "Website enrichment complete", description: `Updated: ${data.updatedFields.join(', ')}` });
            await loadData();
          }
        } catch (err) {
          console.error('Auto-enrich error:', err);
        } finally {
          setIsEnriching(false);
        }
      }

      // Auto-extract from transcript if it was just added (runs second, overwrites)
      if (transcriptWasAdded) {
        toast({ title: "Auto-extracting", description: "Extracting data from transcript..." });
        setIsExtracting(true);
        try {
          const { data } = await supabase.functions.invoke('extract-deal-transcript', {
            body: { dealId: id }
          });
          if (data?.success) {
            const followupNote = data.hasFollowupQuestions ? " Some data needs clarification." : "";
            toast({ title: "Transcript extraction complete", description: `Updated ${data.extractedFields?.length || 0} fields.${followupNote}` });
            await loadData();
          }
        } catch (err) {
          console.error('Auto-extract error:', err);
        } finally {
          setIsExtracting(false);
        }
      }
    } catch (err) {
      toast({ title: "Save failed", description: "Failed to save changes", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate EBITDA amount if we have revenue and margin
  const calculatedEbitdaAmount = deal?.revenue && deal?.ebitda_percentage 
    ? (deal.revenue * deal.ebitda_percentage / 100).toFixed(2)
    : null;

  const hasLowConfidenceData = deal?.revenue_confidence === 'low' || deal?.ebitda_confidence === 'low';
  const hasFollowupQuestions = deal?.financial_followup_questions?.length > 0;

  if (isLoading) return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  if (!deal) return <AppLayout><div className="text-center py-12">Deal not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">{deal.deal_name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span>{tracker?.industry_name}</span>
              {deal.industry_type && <span>• {deal.industry_type}</span>}
            </div>
          </div>
          <Badge variant={deal.status === "Active" ? "active" : deal.status === "Closed" ? "closed" : "dead"} className="text-sm">{deal.status}</Badge>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                <X className="w-4 h-4 mr-2" />Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={handleStartEdit}>
              <Pencil className="w-4 h-4 mr-2" />Edit
            </Button>
          )}
        </div>

        {/* Low Confidence Warning Banner */}
        {hasLowConfidenceData && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Financial Data Needs Clarification</p>
              <p className="text-sm text-amber-600 dark:text-amber-500">Some extracted values have low confidence. Review source quotes and schedule a follow-up call to confirm.</p>
            </div>
          </div>
        )}

        {/* Follow-up Questions Panel */}
        {hasFollowupQuestions && (
          <FollowupQuestionsPanel questions={deal.financial_followup_questions} />
        )}

        {/* Attachments & Actions - Moved to top */}
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Attachments & Actions</h2>
          </div>
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Company Website</label>
                <Input 
                  value={editData.company_website} 
                  onChange={(e) => setEditData({ ...editData, company_website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Transcript Link</label>
                <Input 
                  value={editData.transcript_link} 
                  onChange={(e) => setEditData({ ...editData, transcript_link: e.target.value })}
                  placeholder="https://docs.google.com/..."
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {deal.transcript_link && (
                <>
                  <a 
                    href={deal.transcript_link.startsWith('http') ? deal.transcript_link : `https://${deal.transcript_link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline border rounded-md px-3 py-2"
                  >
                    <FileText className="w-4 h-4" /> View Call Transcript
                  </a>
                  <Button 
                    variant="outline" 
                    onClick={handleExtractTranscript} 
                    disabled={isExtracting}
                  >
                    {isExtracting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {isExtracting ? "Extracting..." : "Extract from Transcript"}
                  </Button>
                </>
              )}
              {deal.company_website && (
                <Button 
                  variant="outline" 
                  onClick={handleEnrichFromWebsite} 
                  disabled={isEnriching}
                >
                  {isEnriching ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Globe className="w-4 h-4 mr-2" />
                  )}
                  {isEnriching ? "Enriching..." : "Enrich from Website"}
                </Button>
              )}
              <Button onClick={() => navigate(`/deals/${id}/matching`)}>
                <Users className="w-4 h-4 mr-2" />View Buyer Matches
              </Button>
              <Button variant="outline" onClick={() => navigate(`/deals/${id}/introductions`)}>
                Track Introductions
              </Button>
            </div>
          )}
        </div>

        {/* Row 1: Company Overview & Financial Overview */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Company Overview */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Building2 className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Company Overview</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <ExternalLink className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Website</p>
                  {deal.company_website ? (
                    <a 
                      href={deal.company_website.startsWith("http") ? deal.company_website : `https://${deal.company_website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {deal.company_website}
                    </a>
                  ) : (
                    <p className="text-muted-foreground italic">Not specified</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Headquarters</p>
                  {isEditing ? (
                    <Input value={editData.headquarters} onChange={(e) => setEditData({ ...editData, headquarters: e.target.value })} placeholder="City, State" className="mt-1" />
                  ) : (
                    <p className={deal.headquarters ? "font-medium" : "text-muted-foreground italic"}>{deal.headquarters || "Not specified"}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Founded</p>
                  {isEditing ? (
                    <Input type="number" value={editData.founded_year} onChange={(e) => setEditData({ ...editData, founded_year: e.target.value })} placeholder="2000" className="mt-1" />
                  ) : (
                    <p className={deal.founded_year ? "font-medium" : "text-muted-foreground italic"}>{deal.founded_year || "Not specified"}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Employees</p>
                  {isEditing ? (
                    <Input type="number" value={editData.employee_count} onChange={(e) => setEditData({ ...editData, employee_count: e.target.value })} placeholder="50" className="mt-1" />
                  ) : (
                    <p className={deal.employee_count ? "font-medium" : "text-muted-foreground italic"}>{deal.employee_count ? `${deal.employee_count}+` : "Not specified"}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Industry</p>
                  {isEditing ? (
                    <Input value={editData.industry_type} onChange={(e) => setEditData({ ...editData, industry_type: e.target.value })} placeholder="Auto Body / Collision" className="mt-1" />
                  ) : (
                    <p className={deal.industry_type ? "font-medium" : "text-muted-foreground italic"}>{deal.industry_type || "Not specified"}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Store className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Number of Locations</p>
                  {isEditing ? (
                    <Input type="number" value={editData.location_count} onChange={(e) => setEditData({ ...editData, location_count: e.target.value })} placeholder="1" className="mt-1" />
                  ) : (
                    <>
                      <p className="font-medium">{deal.location_count || 1} {(deal.location_count || 1) === 1 ? 'location' : 'locations'}</p>
                      {(deal.location_count || 1) < 3 && (
                        <p className="text-xs text-muted-foreground mt-0.5">Requires buyer within 100 miles</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Overview - Enhanced with confidence indicators */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <DollarSign className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Financial Overview</h2>
            </div>
            <div className="space-y-5">
              {/* Revenue Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Revenue (in $M)</p>
                  {!isEditing && <ConfidenceBadge 
                    confidence={deal.revenue_confidence}
                    isInferred={deal.revenue_is_inferred}
                    sourceQuote={deal.revenue_source_quote}
                  />}
                </div>
                {isEditing ? (
                  <Input type="number" step="0.1" value={editData.revenue} onChange={(e) => setEditData({ ...editData, revenue: e.target.value })} placeholder="5.0" />
                ) : (
                  <p className={deal.revenue ? "text-3xl font-bold text-foreground" : "text-muted-foreground italic"}>
                    {deal.revenue ? `$${deal.revenue}M` : "Not specified"}
                  </p>
                )}
                {!isEditing && deal.revenue_source_quote && (
                  <Collapsible>
                    <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <MessageSquareWarning className="w-3 h-3" />
                      View source quote
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="border-l-2 border-primary/30 pl-3 text-sm italic text-muted-foreground">
                        "{deal.revenue_source_quote}"
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              {/* EBITDA Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">EBITDA Margin (%)</p>
                  {!isEditing && <ConfidenceBadge 
                    confidence={deal.ebitda_confidence}
                    isInferred={deal.ebitda_is_inferred}
                    sourceQuote={deal.ebitda_source_quote}
                  />}
                </div>
                {isEditing ? (
                  <Input type="number" step="1" value={editData.ebitda_percentage} onChange={(e) => setEditData({ ...editData, ebitda_percentage: e.target.value })} placeholder="20" />
                ) : deal.ebitda_percentage ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <p className="text-2xl font-bold text-foreground">{deal.ebitda_percentage}%</p>
                      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${Math.min(deal.ebitda_percentage * 2, 100)}%` }}
                        />
                      </div>
                    </div>
                    {(deal.ebitda_amount || calculatedEbitdaAmount) && (
                      <p className="text-sm text-muted-foreground">
                        EBITDA: <span className="font-medium text-foreground">${deal.ebitda_amount || calculatedEbitdaAmount}M</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">Not specified</p>
                )}
                {!isEditing && deal.ebitda_source_quote && (
                  <Collapsible>
                    <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <MessageSquareWarning className="w-3 h-3" />
                      View source quote
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="border-l-2 border-primary/30 pl-3 text-sm italic text-muted-foreground">
                        "{deal.ebitda_source_quote}"
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              {/* Financial Notes */}
              {deal.financial_notes && !isEditing && (
                <div className="pt-2 border-t">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Extraction Notes</p>
                  <p className="text-sm text-muted-foreground">{deal.financial_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Executive Summary */}
        <div className="bg-card rounded-lg border p-6 space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Executive Summary</h2>
          </div>
          {isEditing ? (
            <Textarea 
              value={editData.company_overview} 
              onChange={(e) => setEditData({ ...editData, company_overview: e.target.value })} 
              placeholder="Company overview and executive summary..."
              rows={4}
            />
          ) : (
            <p className={deal.company_overview ? "text-sm leading-relaxed" : "text-sm text-muted-foreground italic"}>{deal.company_overview || "No executive summary available"}</p>
          )}
        </div>

        {/* Row 3: Services & Business Model + Geographic Coverage */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Services & Business Model */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Briefcase className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Services & Business Model</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Service Mix</p>
                {isEditing ? (
                  <Textarea 
                    value={editData.service_mix} 
                    onChange={(e) => setEditData({ ...editData, service_mix: e.target.value })} 
                    placeholder="Services offered..."
                    rows={2}
                  />
                ) : (
                  <p className={deal.service_mix ? "" : "text-muted-foreground italic"}>{deal.service_mix || "Not specified"}</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Business Model</p>
                {isEditing ? (
                  <Input 
                    value={editData.business_model} 
                    onChange={(e) => setEditData({ ...editData, business_model: e.target.value })} 
                    placeholder="B2B, B2C, etc."
                  />
                ) : deal.business_model ? (
                  <Badge variant="outline">{deal.business_model}</Badge>
                ) : (
                  <p className="text-muted-foreground italic">Not specified</p>
                )}
              </div>
            </div>
          </div>

          {/* Geographic Coverage */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <MapPin className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Geographic Coverage</h2>
            </div>
            {isEditing ? (
              <div>
                <Input 
                  value={editData.geography} 
                  onChange={(e) => setEditData({ ...editData, geography: e.target.value })} 
                  placeholder="CA, TX, NY (comma-separated state codes)"
                />
                <p className="text-xs text-muted-foreground mt-1">Enter 2-letter state codes separated by commas</p>
              </div>
            ) : deal.geography?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {deal.geography.map((geo: string) => (
                  <Badge key={geo} variant="secondary" className="text-sm font-medium">{geo}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No geographic information available</p>
            )}
          </div>
        </div>

        {/* Row 4: Owner Goals & Transition */}
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Target className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Owner Goals & Transition</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Owner Goals</p>
                {isEditing ? (
                  <Textarea 
                    value={editData.owner_goals} 
                    onChange={(e) => setEditData({ ...editData, owner_goals: e.target.value })} 
                    placeholder="Owner's goals for the sale..."
                    rows={2}
                  />
                ) : (
                  <p className={deal.owner_goals ? "" : "text-muted-foreground italic"}>{deal.owner_goals || "Not specified"}</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Special Requirements</p>
                {isEditing ? (
                  <Textarea 
                    value={editData.special_requirements} 
                    onChange={(e) => setEditData({ ...editData, special_requirements: e.target.value })} 
                    placeholder="Any special requirements..."
                    rows={2}
                  />
                ) : (
                  <p className={deal.special_requirements ? "" : "text-muted-foreground italic"}>{deal.special_requirements || "None"}</p>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Ownership Structure</p>
                {isEditing ? (
                  <Input 
                    value={editData.ownership_structure} 
                    onChange={(e) => setEditData({ ...editData, ownership_structure: e.target.value })} 
                    placeholder="Single owner, Partnership, etc."
                  />
                ) : (
                  <p className={deal.ownership_structure ? "" : "text-muted-foreground italic"}>{deal.ownership_structure || "Not specified"}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row 5: Primary Contact */}
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <User className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Primary Contact</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Name</p>
                  {isEditing ? (
                    <Input value={editData.contact_name} onChange={(e) => setEditData({ ...editData, contact_name: e.target.value })} placeholder="Contact name" className="mt-1" />
                  ) : (
                    <p className={deal.contact_name ? "font-medium" : "text-muted-foreground italic"}>{deal.contact_name || "Not specified"}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Email</p>
                  {isEditing ? (
                    <Input type="email" value={editData.contact_email} onChange={(e) => setEditData({ ...editData, contact_email: e.target.value })} placeholder="email@example.com" className="mt-1" />
                  ) : deal.contact_email ? (
                    <a href={`mailto:${deal.contact_email}`} className="text-primary hover:underline">{deal.contact_email}</a>
                  ) : (
                    <p className="text-muted-foreground italic">Not specified</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Phone</p>
                  {isEditing ? (
                    <Input type="tel" value={editData.contact_phone} onChange={(e) => setEditData({ ...editData, contact_phone: e.target.value })} placeholder="555-123-4567" className="mt-1" />
                  ) : deal.contact_phone ? (
                    <a href={`tel:${deal.contact_phone}`} className="text-primary hover:underline">{deal.contact_phone}</a>
                  ) : (
                    <p className="text-muted-foreground italic">Not specified</p>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Linkedin className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">LinkedIn</p>
                  {isEditing ? (
                    <Input value={editData.contact_linkedin} onChange={(e) => setEditData({ ...editData, contact_linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." className="mt-1" />
                  ) : deal.contact_linkedin ? (
                    <a 
                      href={deal.contact_linkedin.startsWith("http") ? deal.contact_linkedin : `https://${deal.contact_linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View Profile
                    </a>
                  ) : (
                    <p className="text-muted-foreground italic">Not specified</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 6: Additional Information */}
        <div className="bg-card rounded-lg border p-6 space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Hash className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Additional Information</h2>
          </div>
          {isEditing ? (
            <Textarea 
              value={editData.additional_info} 
              onChange={(e) => setEditData({ ...editData, additional_info: e.target.value })} 
              placeholder="Any additional information..."
              rows={3}
            />
          ) : (
            <p className={deal.additional_info ? "text-sm" : "text-sm text-muted-foreground italic"}>{deal.additional_info || "No additional information"}</p>
          )}
        </div>

        {/* Footer: Timestamps */}
        <div className="flex items-center justify-end gap-6 text-xs text-muted-foreground border-t pt-4">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Created: {format(new Date(deal.created_at), "MMM d, yyyy")}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Updated: {format(new Date(deal.updated_at), "MMM d, yyyy")}
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
