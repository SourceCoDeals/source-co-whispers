import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Users, ExternalLink, FileText, Calendar, Building2, DollarSign, MapPin, Target, User, Phone, Mail, Briefcase, Clock, Hash, Linkedin, Sparkles, AlertTriangle, MessageSquareWarning, Store, Globe, Pencil, Save, X, ShoppingCart, TrendingUp, AlertCircle, Server, Home } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { FollowupQuestionsPanel } from "@/components/FollowupQuestionsPanel";
import { EditableSection } from "@/components/EditableSection";
import { ContactCard } from "@/components/ContactCard";
import { DealTranscriptsSection } from "@/components/DealTranscriptsSection";
import { DealHistorySection } from "@/components/DealHistorySection";
import { DealNotesSection } from "@/components/DealNotesSection";

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
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  // Section-specific edit states
  const [editCompany, setEditCompany] = useState<any>({});
  const [editFinancial, setEditFinancial] = useState<any>({});
  const [editSummary, setEditSummary] = useState<any>({});
  const [editServices, setEditServices] = useState<any>({});
  const [editGeography, setEditGeography] = useState<any>({});
  const [editOwnerGoals, setEditOwnerGoals] = useState<any>({});
  const [editContact, setEditContact] = useState<any>({});
  const [editAdditional, setEditAdditional] = useState<any>({});
  const [editAttachments, setEditAttachments] = useState<any>({});
  const [editEndMarket, setEditEndMarket] = useState<any>({});

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const [dealRes, transcriptsRes] = await Promise.all([
      supabase.from("deals").select("*").eq("id", id).maybeSingle(),
      supabase.from("deal_transcripts").select("*").eq("deal_id", id).order("call_date", { ascending: false }),
    ]);
    
    const dealData = dealRes.data;
    setDeal(dealData);
    setTranscripts(transcriptsRes.data || []);
    
    if (dealData) {
      const { data: trackerData } = await supabase.from("industry_trackers").select("*").eq("id", dealData.tracker_id).maybeSingle();
      setTracker(trackerData);
      resetEditStates(dealData);
    }
    setIsLoading(false);
  };

  const resetEditStates = (dealData: any) => {
    setEditCompany({
      headquarters: dealData.headquarters || '',
      founded_year: dealData.founded_year || '',
      employee_count: dealData.employee_count || '',
      industry_type: dealData.industry_type || '',
      location_count: dealData.location_count || '',
    });
    setEditFinancial({
      revenue: dealData.revenue || '',
      ebitda_percentage: dealData.ebitda_percentage || '',
    });
    setEditSummary({
      company_overview: dealData.company_overview || '',
    });
    setEditServices({
      service_mix: dealData.service_mix || '',
      business_model: dealData.business_model || '',
    });
    setEditGeography({
      geography: dealData.geography?.join(', ') || '',
    });
    setEditOwnerGoals({
      owner_goals: dealData.owner_goals || '',
      special_requirements: dealData.special_requirements || '',
      ownership_structure: dealData.ownership_structure || '',
    });
    setEditContact({
      contact_name: dealData.contact_name || '',
      contact_email: dealData.contact_email || '',
      contact_phone: dealData.contact_phone || '',
      contact_linkedin: dealData.contact_linkedin || '',
    });
    setEditAdditional({
      additional_info: dealData.additional_info || '',
      key_risks: dealData.key_risks || [],
      competitive_position: dealData.competitive_position || '',
      technology_systems: dealData.technology_systems || '',
      real_estate: dealData.real_estate || '',
      growth_trajectory: dealData.growth_trajectory || '',
    });
    setEditAttachments({
      company_website: dealData.company_website || '',
      transcript_link: dealData.transcript_link || '',
    });
    setEditEndMarket({
      end_market_customers: dealData.end_market_customers || '',
      customer_concentration: dealData.customer_concentration || '',
      customer_geography: dealData.customer_geography || '',
    });
  };

  const saveSection = useCallback(async (updates: any) => {
    const { error } = await supabase.from("deals").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      throw error;
    }
    toast({ title: "Saved", description: "Changes saved successfully." });
    await loadData();
  }, [id, toast]);

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

        {/* Transcripts Section */}
        <div className="bg-card border rounded-lg p-4">
          <DealTranscriptsSection
            dealId={id!}
            transcripts={transcripts}
            onDataChange={loadData}
          />
        </div>

        {/* General Notes Section */}
        <DealNotesSection
          dealId={id!}
          existingExtractionSources={deal.extraction_sources as Record<string, { source: string; extractedAt: string }> | undefined}
          onNotesApplied={loadData}
        />


        <EditableSection
          title="Website & Actions"
          icon={<Globe className="w-5 h-5" />}
          onSave={async () => {
            const oldWebsite = deal.company_website;
            await saveSection({
              company_website: editAttachments.company_website || null,
            });
            // Auto-enrich if website was just added
            if (!oldWebsite && editAttachments.company_website) {
              setIsEnriching(true);
              try {
                const { data } = await supabase.functions.invoke('enrich-deal', { body: { dealId: id, onlyFillEmpty: true } });
                if (data?.success && data?.updatedFields?.length > 0) {
                  toast({ title: "Website enrichment complete", description: `Updated: ${data.updatedFields.join(', ')}` });
                  await loadData();
                }
              } finally {
                setIsEnriching(false);
              }
            }
          }}
          editContent={
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Company Website</label>
              <Input 
                value={editAttachments.company_website} 
                onChange={(e) => setEditAttachments({ ...editAttachments, company_website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          }
        >
          <div className="flex flex-wrap gap-3">
            {deal.company_website && (
              <>
                <a 
                  href={deal.company_website.startsWith('http') ? deal.company_website : `https://${deal.company_website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline border rounded-md px-3 py-2"
                >
                  <ExternalLink className="w-4 h-4" /> View Website
                </a>
                <Button 
                  variant="outline" 
                  onClick={handleEnrichFromWebsite} 
                  disabled={isEnriching}
                >
                  {isEnriching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {isEnriching ? "Enriching..." : "Enrich from Website"}
                </Button>
              </>
            )}
            <Button onClick={() => navigate(`/deals/${id}/matching`)}>
              <Users className="w-4 h-4 mr-2" />View Buyer Matches
            </Button>
            <Button variant="outline" onClick={() => navigate(`/deals/${id}/introductions`)}>
              Buyer History
            </Button>
          </div>
        </EditableSection>

        {/* Row 1: Company Overview & Financial Overview */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Company Overview */}
          <EditableSection
            title="Company Overview"
            icon={<Building2 className="w-5 h-5" />}
            onSave={async () => {
              await saveSection({
                headquarters: editCompany.headquarters || null,
                founded_year: editCompany.founded_year ? parseInt(editCompany.founded_year) : null,
                employee_count: editCompany.employee_count ? parseInt(editCompany.employee_count) : null,
                industry_type: editCompany.industry_type || null,
                location_count: editCompany.location_count ? parseInt(editCompany.location_count) : null,
              });
            }}
            editContent={
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-2.5" />
                  <div className="flex-1">
                    <label className="text-muted-foreground text-xs uppercase tracking-wide">Headquarters</label>
                    <Input value={editCompany.headquarters} onChange={(e) => setEditCompany({ ...editCompany, headquarters: e.target.value })} placeholder="City, State" className="mt-1" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-2.5" />
                  <div className="flex-1">
                    <label className="text-muted-foreground text-xs uppercase tracking-wide">Founded</label>
                    <Input type="number" value={editCompany.founded_year} onChange={(e) => setEditCompany({ ...editCompany, founded_year: e.target.value })} placeholder="2000" className="mt-1" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-muted-foreground mt-2.5" />
                  <div className="flex-1">
                    <label className="text-muted-foreground text-xs uppercase tracking-wide">Employees</label>
                    <Input type="number" value={editCompany.employee_count} onChange={(e) => setEditCompany({ ...editCompany, employee_count: e.target.value })} placeholder="50" className="mt-1" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Briefcase className="w-4 h-4 text-muted-foreground mt-2.5" />
                  <div className="flex-1">
                    <label className="text-muted-foreground text-xs uppercase tracking-wide">Industry</label>
                    <Input value={editCompany.industry_type} onChange={(e) => setEditCompany({ ...editCompany, industry_type: e.target.value })} placeholder="Auto Body / Collision" className="mt-1" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Store className="w-4 h-4 text-muted-foreground mt-2.5" />
                  <div className="flex-1">
                    <label className="text-muted-foreground text-xs uppercase tracking-wide">Number of Locations</label>
                    <Input type="number" value={editCompany.location_count} onChange={(e) => setEditCompany({ ...editCompany, location_count: e.target.value })} placeholder="1" className="mt-1" />
                  </div>
                </div>
              </div>
            }
          >
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
                  <p className={deal.headquarters ? "font-medium" : "text-muted-foreground italic"}>{deal.headquarters || "Not specified"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Founded</p>
                  <p className={deal.founded_year ? "font-medium" : "text-muted-foreground italic"}>{deal.founded_year || "Not specified"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Employees</p>
                  <p className={deal.employee_count ? "font-medium" : "text-muted-foreground italic"}>{deal.employee_count ? `${deal.employee_count}+` : "Not specified"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Industry</p>
                  <p className={deal.industry_type ? "font-medium" : "text-muted-foreground italic"}>{deal.industry_type || "Not specified"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Store className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Number of Locations</p>
                  <p className="font-medium">{deal.location_count || 1} {(deal.location_count || 1) === 1 ? 'location' : 'locations'}</p>
                  {(deal.location_count || 1) < 3 && (
                    <p className="text-xs text-muted-foreground mt-0.5">Requires buyer within 100 miles</p>
                  )}
                </div>
              </div>
            </div>
          </EditableSection>

          {/* Financial Overview */}
          <EditableSection
            title="Financial Overview"
            icon={<DollarSign className="w-5 h-5" />}
            onSave={async () => {
              await saveSection({
                revenue: editFinancial.revenue ? parseFloat(editFinancial.revenue) : null,
                ebitda_percentage: editFinancial.ebitda_percentage ? parseFloat(editFinancial.ebitda_percentage) : null,
              });
            }}
            editContent={
              <div className="space-y-4">
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Revenue (in $M)</label>
                  <Input type="number" step="0.1" value={editFinancial.revenue} onChange={(e) => setEditFinancial({ ...editFinancial, revenue: e.target.value })} placeholder="5.0" />
                </div>
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">EBITDA Margin (%)</label>
                  <Input type="number" step="1" value={editFinancial.ebitda_percentage} onChange={(e) => setEditFinancial({ ...editFinancial, ebitda_percentage: e.target.value })} placeholder="20" />
                </div>
              </div>
            }
          >
            <div className="space-y-5">
              {/* Revenue Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Revenue (in $M)</p>
                  <ConfidenceBadge 
                    confidence={deal.revenue_confidence}
                    isInferred={deal.revenue_is_inferred}
                    sourceQuote={deal.revenue_source_quote}
                  />
                </div>
                <p className={deal.revenue ? "text-3xl font-bold text-foreground" : "text-muted-foreground italic"}>
                  {deal.revenue ? `$${deal.revenue}M` : "Not specified"}
                </p>
                {deal.revenue_source_quote && (
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
                  <ConfidenceBadge 
                    confidence={deal.ebitda_confidence}
                    isInferred={deal.ebitda_is_inferred}
                    sourceQuote={deal.ebitda_source_quote}
                  />
                </div>
                {deal.ebitda_percentage ? (
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
                {deal.ebitda_source_quote && (
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
              {deal.financial_notes && (
                <div className="pt-2 border-t">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Extraction Notes</p>
                  <p className="text-sm text-muted-foreground">{deal.financial_notes}</p>
                </div>
              )}
            </div>
          </EditableSection>
        </div>

        {/* Row 2: Executive Summary */}
        <EditableSection
          title="Executive Summary"
          icon={<FileText className="w-5 h-5" />}
          onSave={async () => {
            await saveSection({
              company_overview: editSummary.company_overview || null,
            });
          }}
          editContent={
            <Textarea 
              value={editSummary.company_overview} 
              onChange={(e) => setEditSummary({ ...editSummary, company_overview: e.target.value })} 
              placeholder="Company overview and executive summary..."
              rows={4}
            />
          }
        >
          <p className={deal.company_overview ? "text-sm leading-relaxed" : "text-sm text-muted-foreground italic"}>{deal.company_overview || "No executive summary available"}</p>
        </EditableSection>

        {/* Row 3: Services & Business Model + Geographic Coverage */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Services & Business Model */}
          <EditableSection
            title="Services & Business Model"
            icon={<Briefcase className="w-5 h-5" />}
            onSave={async () => {
              await saveSection({
                service_mix: editServices.service_mix || null,
                business_model: editServices.business_model || null,
              });
            }}
            editContent={
              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Service Mix</label>
                  <Textarea 
                    value={editServices.service_mix} 
                    onChange={(e) => setEditServices({ ...editServices, service_mix: e.target.value })} 
                    placeholder="Services offered..."
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Business Model</label>
                  <Input 
                    value={editServices.business_model} 
                    onChange={(e) => setEditServices({ ...editServices, business_model: e.target.value })} 
                    placeholder="B2B, B2C, etc."
                  />
                </div>
              </div>
            }
          >
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Service Mix</p>
                <p className={deal.service_mix ? "" : "text-muted-foreground italic"}>{deal.service_mix || "Not specified"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Business Model</p>
                {deal.business_model ? (
                  <Badge variant="outline">{deal.business_model}</Badge>
                ) : (
                  <p className="text-muted-foreground italic">Not specified</p>
                )}
              </div>
            </div>
          </EditableSection>

          {/* Geographic Coverage */}
          <EditableSection
            title="Geographic Coverage"
            icon={<MapPin className="w-5 h-5" />}
            onSave={async () => {
              const geographyArray = editGeography.geography 
                ? editGeography.geography.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean)
                : null;
              await saveSection({
                geography: geographyArray,
              });
            }}
            editContent={
              <div>
                <Input 
                  value={editGeography.geography} 
                  onChange={(e) => setEditGeography({ ...editGeography, geography: e.target.value })} 
                  placeholder="CA, TX, NY (comma-separated state codes)"
                />
                <p className="text-xs text-muted-foreground mt-1">Enter 2-letter state codes separated by commas</p>
              </div>
            }
          >
            {deal.geography?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {deal.geography.map((geo: string) => (
                  <Badge key={geo} variant="secondary" className="text-sm font-medium">{geo}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No geographic information available</p>
            )}
          </EditableSection>
        </div>

        {/* Row 4: Owner Goals & Transition */}
        <EditableSection
          title="Owner Goals & Transition"
          icon={<Target className="w-5 h-5" />}
          onSave={async () => {
            await saveSection({
              owner_goals: editOwnerGoals.owner_goals || null,
              special_requirements: editOwnerGoals.special_requirements || null,
              ownership_structure: editOwnerGoals.ownership_structure || null,
            });
          }}
          editContent={
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Owner Goals</label>
                  <Textarea 
                    value={editOwnerGoals.owner_goals} 
                    onChange={(e) => setEditOwnerGoals({ ...editOwnerGoals, owner_goals: e.target.value })} 
                    placeholder="Owner's goals for the sale..."
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Special Requirements</label>
                  <Textarea 
                    value={editOwnerGoals.special_requirements} 
                    onChange={(e) => setEditOwnerGoals({ ...editOwnerGoals, special_requirements: e.target.value })} 
                    placeholder="Any special requirements..."
                    rows={2}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Ownership Structure</label>
                  <Input 
                    value={editOwnerGoals.ownership_structure} 
                    onChange={(e) => setEditOwnerGoals({ ...editOwnerGoals, ownership_structure: e.target.value })} 
                    placeholder="Single owner, Partnership, etc."
                  />
                </div>
              </div>
            </div>
          }
        >
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Owner Goals</p>
                <p className={deal.owner_goals ? "" : "text-muted-foreground italic"}>{deal.owner_goals || "Not specified"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Special Requirements</p>
                <p className={deal.special_requirements ? "" : "text-muted-foreground italic"}>{deal.special_requirements || "None"}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Ownership Structure</p>
                <p className={deal.ownership_structure ? "" : "text-muted-foreground italic"}>{deal.ownership_structure || "Not specified"}</p>
              </div>
            </div>
          </div>
        </EditableSection>

        {/* Row 5: Primary Contact - Improved Design */}
        <EditableSection
          title="Primary Contact"
          icon={<User className="w-5 h-5" />}
          onSave={async () => {
            await saveSection({
              contact_name: editContact.contact_name || null,
              contact_email: editContact.contact_email || null,
              contact_phone: editContact.contact_phone || null,
              contact_linkedin: editContact.contact_linkedin || null,
            });
          }}
          editContent={
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Name</label>
                <Input value={editContact.contact_name} onChange={(e) => setEditContact({ ...editContact, contact_name: e.target.value })} placeholder="Contact name" />
              </div>
              <div>
                <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Email</label>
                <Input type="email" value={editContact.contact_email} onChange={(e) => setEditContact({ ...editContact, contact_email: e.target.value })} placeholder="email@example.com" />
              </div>
              <div>
                <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Phone</label>
                <Input type="tel" value={editContact.contact_phone} onChange={(e) => setEditContact({ ...editContact, contact_phone: e.target.value })} placeholder="555-123-4567" />
              </div>
              <div>
                <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">LinkedIn</label>
                <Input value={editContact.contact_linkedin} onChange={(e) => setEditContact({ ...editContact, contact_linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
              </div>
            </div>
          }
        >
          <ContactCard 
            name={deal.contact_name}
            email={deal.contact_email}
            phone={deal.contact_phone}
            linkedin={deal.contact_linkedin}
          />
        </EditableSection>

        {/* End Market / Customers Section */}
        <EditableSection
          title="End Market / Customers"
          icon={<ShoppingCart className="w-5 h-5" />}
          onSave={async () => {
            await saveSection({
              end_market_customers: editEndMarket.end_market_customers || null,
              customer_concentration: editEndMarket.customer_concentration || null,
              customer_geography: editEndMarket.customer_geography || null,
            });
          }}
          editContent={
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Customer Types / Segments</label>
                <Textarea 
                  value={editEndMarket.end_market_customers} 
                  onChange={(e) => setEditEndMarket({ ...editEndMarket, end_market_customers: e.target.value })} 
                  placeholder="Who are the primary customers? (e.g., insurance companies, individual consumers, commercial contractors)"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Customer Concentration</label>
                <Textarea 
                  value={editEndMarket.customer_concentration} 
                  onChange={(e) => setEditEndMarket({ ...editEndMarket, customer_concentration: e.target.value })} 
                  placeholder="Top customer info, concentration risk (e.g., 'Top 3 customers = 40% of revenue')"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Customer Geography</label>
                <Input 
                  value={editEndMarket.customer_geography} 
                  onChange={(e) => setEditEndMarket({ ...editEndMarket, customer_geography: e.target.value })} 
                  placeholder="Where customers are located (e.g., 'Nationwide', 'Local metro area')"
                />
              </div>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Customer Types / Segments</p>
              <p className={deal.end_market_customers ? "" : "text-muted-foreground italic"}>{deal.end_market_customers || "Not specified"}</p>
            </div>
            {deal.customer_concentration && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Customer Concentration</p>
                <p>{deal.customer_concentration}</p>
              </div>
            )}
            {deal.customer_geography && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Customer Geography</p>
                <p>{deal.customer_geography}</p>
              </div>
            )}
          </div>
        </EditableSection>

        {/* Row 6: Additional Information - Enhanced with structured fields */}
        <EditableSection
          title="Additional Information"
          icon={<Hash className="w-5 h-5" />}
          onSave={async () => {
            await saveSection({
              additional_info: editAdditional.additional_info || null,
              key_risks: editAdditional.key_risks?.length ? editAdditional.key_risks : null,
              competitive_position: editAdditional.competitive_position || null,
              technology_systems: editAdditional.technology_systems || null,
              real_estate: editAdditional.real_estate || null,
              growth_trajectory: editAdditional.growth_trajectory || null,
            });
          }}
          editContent={
            <div className="space-y-4 text-sm">
              <div>
                <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Key Risks (one per line)</label>
                <Textarea 
                  value={editAdditional.key_risks?.join('\n') || ''} 
                  onChange={(e) => setEditAdditional({ 
                    ...editAdditional, 
                    key_risks: e.target.value.split('\n').filter((r: string) => r.trim()) 
                  })} 
                  placeholder="Customer concentration&#10;Key-man dependency&#10;Lease expires 2026"
                  rows={3}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Competitive Position</label>
                  <Textarea 
                    value={editAdditional.competitive_position} 
                    onChange={(e) => setEditAdditional({ ...editAdditional, competitive_position: e.target.value })} 
                    placeholder="Market position, competitors..."
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Technology / Systems</label>
                  <Textarea 
                    value={editAdditional.technology_systems} 
                    onChange={(e) => setEditAdditional({ ...editAdditional, technology_systems: e.target.value })} 
                    placeholder="Key software, systems..."
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Real Estate</label>
                  <Textarea 
                    value={editAdditional.real_estate} 
                    onChange={(e) => setEditAdditional({ ...editAdditional, real_estate: e.target.value })} 
                    placeholder="Owned vs leased, terms..."
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Growth Trajectory</label>
                  <Textarea 
                    value={editAdditional.growth_trajectory} 
                    onChange={(e) => setEditAdditional({ ...editAdditional, growth_trajectory: e.target.value })} 
                    placeholder="Historical growth, outlook..."
                    rows={2}
                  />
                </div>
              </div>
              <div>
                <label className="text-muted-foreground text-xs uppercase tracking-wide mb-1 block">Other Notes</label>
                <Textarea 
                  value={editAdditional.additional_info} 
                  onChange={(e) => setEditAdditional({ ...editAdditional, additional_info: e.target.value })} 
                  placeholder="Any other information..."
                  rows={2}
                />
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-sm">
            {/* Key Risks */}
            {deal.key_risks?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Key Risks</p>
                </div>
                <ul className="space-y-1">
                  {deal.key_risks.map((risk: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Competitive Position */}
            {deal.competitive_position && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Competitive Position</p>
                </div>
                <p>{deal.competitive_position}</p>
              </div>
            )}

            {/* Technology */}
            {deal.technology_systems && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Server className="w-4 h-4 text-muted-foreground" />
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Technology / Systems</p>
                </div>
                <p>{deal.technology_systems}</p>
              </div>
            )}

            {/* Real Estate */}
            {deal.real_estate && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Home className="w-4 h-4 text-muted-foreground" />
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Real Estate</p>
                </div>
                <p>{deal.real_estate}</p>
              </div>
            )}

            {/* Growth */}
            {deal.growth_trajectory && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Growth Trajectory</p>
                </div>
                <p>{deal.growth_trajectory}</p>
              </div>
            )}

            {/* Other Notes */}
            {deal.additional_info && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Other Notes</p>
                <p>{deal.additional_info}</p>
              </div>
            )}

            {/* Empty state */}
            {!deal.key_risks?.length && !deal.competitive_position && !deal.technology_systems && !deal.real_estate && !deal.growth_trajectory && !deal.additional_info && (
              <p className="text-muted-foreground italic">No additional information</p>
            )}
          </div>
        </EditableSection>

        {/* Deal History Section - Other Buyer Universes */}
        {deal.company_id && (
          <DealHistorySection companyId={deal.company_id} currentDealId={id!} />
        )}

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
