import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntelligenceBadge } from "@/components/IntelligenceBadge";
import { BuyerDataSection, DataField, DataListField, DataGrid } from "@/components/BuyerDataSection";
import { Loader2, ArrowLeft, Edit, ExternalLink, Building2, MapPin, Users, BarChart3, History, Target, User, Quote, Globe, FileCheck, FileText, Plus, Link2, Upload, Trash2, Briefcase, DollarSign, TrendingUp, Linkedin, Sparkles, CheckCircle, Clock, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";

export default function BuyerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dealId = searchParams.get('dealId');
  const { toast } = useToast();
  const [buyer, setBuyer] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [transcriptDialogOpen, setTranscriptDialogOpen] = useState(false);
  const [newTranscript, setNewTranscript] = useState({ title: "", url: "", notes: "", call_date: "", transcript_type: "link" });
  const [isUploading, setIsUploading] = useState(false);
  const [processingTranscripts, setProcessingTranscripts] = useState<Set<string>>(new Set());
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<string>>(new Set());
  const [isEnriching, setIsEnriching] = useState(false);
  
  // Deal context state
  const [deal, setDeal] = useState<any>(null);
  const [dealScore, setDealScore] = useState<any>(null);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => { loadData(); }, [id, dealId]);

  const loadData = async () => {
    const [buyerRes, contactsRes, transcriptsRes] = await Promise.all([
      supabase.from("buyers").select("*").eq("id", id).single(),
      supabase.from("buyer_contacts").select("*").eq("buyer_id", id),
      supabase.from("buyer_transcripts").select("*").eq("buyer_id", id).order("call_date", { ascending: false }),
    ]);
    setBuyer(buyerRes.data);
    setContacts(contactsRes.data || []);
    setTranscripts(transcriptsRes.data || []);
    setEditData(buyerRes.data || {});
    
    // Load deal context if dealId is provided
    if (dealId) {
      const [dealRes, scoreRes] = await Promise.all([
        supabase.from("deals").select("*").eq("id", dealId).single(),
        supabase.from("buyer_deal_scores").select("*").eq("deal_id", dealId).eq("buyer_id", id).single(),
      ]);
      setDeal(dealRes.data);
      setDealScore(scoreRes.data);
    }
    
    setIsLoading(false);
  };

  const approveBuyerForDeal = async () => {
    if (!dealId || !id) return;
    setIsApproving(true);
    
    try {
      // Check if score exists
      const { data: existing } = await supabase
        .from("buyer_deal_scores")
        .select("id")
        .eq("deal_id", dealId)
        .eq("buyer_id", id)
        .single();
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("buyer_deal_scores")
          .update({ selected_for_outreach: true })
          .eq("deal_id", dealId)
          .eq("buyer_id", id);
        
        if (error) throw error;
      } else {
        // Create new score record
        const { error } = await supabase
          .from("buyer_deal_scores")
          .insert({
            deal_id: dealId,
            buyer_id: id,
            selected_for_outreach: true,
            composite_score: 0,
          });
        
        if (error) throw error;
      }
      
      setDealScore({ ...dealScore, selected_for_outreach: true });
      toast({ title: "Buyer approved", description: `${buyer?.platform_company_name || buyer?.pe_firm_name} approved for ${deal?.deal_name}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsApproving(false);
    }
  };

  const addTranscriptLink = async () => {
    if (!newTranscript.title.trim()) return;
    const { error } = await supabase.from("buyer_transcripts").insert({
      buyer_id: id,
      title: newTranscript.title,
      url: newTranscript.url,
      notes: newTranscript.notes,
      call_date: newTranscript.call_date || null,
      transcript_type: "link"
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Transcript link added" });
    setNewTranscript({ title: "", url: "", notes: "", call_date: "", transcript_type: "link" });
    setTranscriptDialogOpen(false);
    loadData();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    
    // Get current user for storage folder isolation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Upload failed", description: "You must be logged in to upload files", variant: "destructive" });
      setIsUploading(false);
      return;
    }
    
    // Use user ID as first folder for RLS storage policies
    const fileName = `${user.id}/${id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("call-transcripts").upload(fileName, file);
    
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setIsUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("buyer_transcripts").insert({
      buyer_id: id,
      title: file.name,
      url: fileName,
      transcript_type: "file",
      call_date: newTranscript.call_date || null,
    });
    
    if (dbError) { toast({ title: "Error", description: dbError.message, variant: "destructive" }); }
    else { toast({ title: "Transcript uploaded" }); }
    
    setIsUploading(false);
    setTranscriptDialogOpen(false);
    loadData();
  };

  const deleteTranscript = async (transcript: any) => {
    if (transcript.transcript_type === "file") {
      await supabase.storage.from("call-transcripts").remove([transcript.url]);
    }
    await supabase.from("buyer_transcripts").delete().eq("id", transcript.id);
    toast({ title: "Transcript removed" });
    loadData();
  };

  const getTranscriptUrl = (transcript: any) => {
    if (transcript.transcript_type === "link") return transcript.url;
    const { data } = supabase.storage.from("call-transcripts").getPublicUrl(transcript.url);
    return data.publicUrl;
  };

  const processTranscriptWithAI = async (transcriptId: string, applyToProfile: boolean = false) => {
    setProcessingTranscripts(prev => new Set(prev).add(transcriptId));
    
    try {
      const { data, error } = await supabase.functions.invoke('extract-transcript', {
        body: { transcriptId, applyToProfile }
      });

      if (error) {
        toast({ title: "Processing failed", description: error.message, variant: "destructive" });
        return;
      }

      if (data.needsContent) {
        toast({ 
          title: "Insufficient content", 
          description: "Please add detailed notes to the transcript before processing.",
          variant: "destructive" 
        });
        return;
      }

      if (data.success) {
        toast({ 
          title: applyToProfile ? "Applied to profile" : "Extraction complete",
          description: data.message
        });
        loadData();
        // Expand the transcript to show extracted data
        setExpandedTranscripts(prev => new Set(prev).add(transcriptId));
      } else {
        toast({ title: "Processing failed", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to process transcript", variant: "destructive" });
    } finally {
      setProcessingTranscripts(prev => {
        const next = new Set(prev);
        next.delete(transcriptId);
        return next;
      });
    }
  };

  const toggleTranscriptExpanded = (transcriptId: string) => {
    setExpandedTranscripts(prev => {
      const next = new Set(prev);
      if (next.has(transcriptId)) {
        next.delete(transcriptId);
      } else {
        next.add(transcriptId);
      }
      return next;
    });
  };

  const getTranscriptStatus = (transcript: any) => {
    if (processingTranscripts.has(transcript.id)) return 'processing';
    if (transcript.processed_at) return 'extracted';
    return 'pending';
  };

  const enrichFromWebsite = async () => {
    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-buyer', {
        body: { buyerId: id }
      });

      if (error) throw error;

      toast({
        title: "Enrichment complete",
        description: `Updated ${buyer.platform_company_name || buyer.pe_firm_name} with website data`
      });
      loadData();
    } catch (err: any) {
      toast({
        title: "Enrichment failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const saveIntelligence = async () => {
    const { error } = await supabase.from("buyers").update({
      // A. Company & Firm Identification
      buyer_linkedin: editData.buyer_linkedin,
      pe_firm_linkedin: editData.pe_firm_linkedin,
      // B. Location & Geography
      hq_country: editData.hq_country,
      hq_region: editData.hq_region,
      other_office_locations: editData.other_office_locations?.split?.(",").map((s: string) => s.trim()).filter(Boolean) || editData.other_office_locations || [],
      acquisition_geography: editData.acquisition_geography?.split?.(",").map((s: string) => s.trim()).filter(Boolean) || editData.acquisition_geography || [],
      target_geographies: editData.target_geographies?.split?.(",").map((s: string) => s.trim()).filter(Boolean) || editData.target_geographies || [],
      geographic_exclusions: editData.geographic_exclusions?.split?.(",").map((s: string) => s.trim()).filter(Boolean) || editData.geographic_exclusions || [],
      // C. Business Description
      industry_vertical: editData.industry_vertical,
      business_summary: editData.business_summary,
      specialized_focus: editData.specialized_focus,
      // D. Customer Profile
      primary_customer_size: editData.primary_customer_size,
      customer_industries: editData.customer_industries?.split?.(",").map((s: string) => s.trim()).filter(Boolean) || editData.customer_industries || [],
      customer_geographic_reach: editData.customer_geographic_reach,
      target_customer_profile: editData.target_customer_profile,
      target_customer_size: editData.target_customer_size,
      target_customer_industries: editData.target_customer_industries?.split?.(",").map((s: string) => s.trim()).filter(Boolean) || editData.target_customer_industries || [],
      target_customer_geography: editData.target_customer_geography,
      // E. Business Model
      business_type: editData.business_type,
      revenue_model: editData.revenue_model,
      go_to_market_strategy: editData.go_to_market_strategy,
      target_business_model: editData.target_business_model,
      business_model_exclusions: editData.business_model_exclusions?.split?.(",").map((s: string) => s.trim()).filter(Boolean) || editData.business_model_exclusions || [],
      business_model_prefs: editData.business_model_prefs,
      // F. Size Criteria
      min_revenue: editData.min_revenue,
      max_revenue: editData.max_revenue,
      revenue_sweet_spot: editData.revenue_sweet_spot,
      min_ebitda: editData.min_ebitda,
      max_ebitda: editData.max_ebitda,
      ebitda_sweet_spot: editData.ebitda_sweet_spot,
      preferred_ebitda: editData.preferred_ebitda,
      // G. Acquisition History
      total_acquisitions: editData.total_acquisitions,
      acquisition_frequency: editData.acquisition_frequency,
      last_acquisition_date: editData.last_acquisition_date || null,
      // H. Investment Criteria
      thesis_summary: editData.thesis_summary,
      service_mix_prefs: editData.service_mix_prefs,
      target_services: editData.target_services?.split?.(",").map((s: string) => s.trim()).filter(Boolean) || editData.target_services || [],
      required_capabilities: editData.required_capabilities?.split?.(",").map((s: string) => s.trim()).filter(Boolean) || editData.required_capabilities || [],
      target_industries: editData.target_industries?.split?.(",").map((s: string) => s.trim()).filter(Boolean) || editData.target_industries || [],
      industry_exclusions: editData.industry_exclusions?.split?.(",").map((s: string) => s.trim()).filter(Boolean) || editData.industry_exclusions || [],
      deal_breakers: editData.deal_breakers?.split?.(",").map((s: string) => s.trim()).filter(Boolean) || editData.deal_breakers || [],
      strategic_priorities: editData.strategic_priorities,
      acquisition_appetite: editData.acquisition_appetite,
      acquisition_timeline: editData.acquisition_timeline,
      owner_roll_requirement: editData.owner_roll_requirement,
      owner_transition_goals: editData.owner_transition_goals,
      thesis_confidence: editData.thesis_confidence,
      key_quotes: editData.key_quotes?.split?.("\n").filter(Boolean) || editData.key_quotes || [],
    }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Intelligence updated!" });
    setIsEditing(false);
    loadData();
  };

  if (isLoading) return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  if (!buyer) return <AppLayout><div className="text-center py-12">Buyer not found</div></AppLayout>;

  const recentAcqs = Array.isArray(buyer.recent_acquisitions) ? buyer.recent_acquisitions : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Deal Context Banner */}
        {deal && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Evaluating for deal:</p>
                  <p className="font-semibold text-primary">{deal.deal_name}</p>
                </div>
                {deal.geography?.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    <MapPin className="w-3 h-3 mr-1" />
                    {deal.geography.slice(0, 2).join(", ")}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {dealScore?.selected_for_outreach ? (
                  <Badge variant="default" className="bg-green-600">
                    <Check className="w-3 h-3 mr-1" />
                    Approved for Outreach
                  </Badge>
                ) : (
                  <Button onClick={approveBuyerForDeal} disabled={isApproving}>
                    {isApproving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Approve for {deal.deal_name}
                  </Button>
                )}
                <Button variant="outline" onClick={() => navigate(`/deals/${dealId}/matching`)}>
                  Back to Matching
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-1">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-display font-bold">
                {buyer.platform_company_name || buyer.pe_firm_name}
              </h1>
              <IntelligenceBadge buyer={buyer} showPercentage />
              {buyer.fee_agreement_status && buyer.fee_agreement_status !== 'None' && (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  <FileCheck className="w-3 h-3 mr-1" />
                  {buyer.fee_agreement_status}
                </Badge>
              )}
            </div>
            {buyer.platform_company_name && (
              <div className="flex items-center gap-2 text-lg text-muted-foreground">
                <Building2 className="w-4 h-4" />
                {buyer.pe_firm_name}
              </div>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              {buyer.platform_website && (
                <a href={buyer.platform_website.startsWith("http") ? buyer.platform_website : `https://${buyer.platform_website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                  <ExternalLink className="w-3.5 h-3.5" />Platform Website
                </a>
              )}
              {buyer.hq_city || buyer.hq_state ? (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />HQ: {[buyer.hq_city, buyer.hq_state, buyer.hq_country].filter(Boolean).join(", ")}</span>
              ) : null}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={enrichFromWebsite}
            disabled={isEnriching || (!buyer.platform_website && !buyer.pe_firm_website)}
          >
            {isEnriching ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Enrich from Website
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="intelligence">Edit Intelligence</TabsTrigger>
            <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab - Redesigned 8 Categories */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* 1. Company & Firm Identification */}
              <BuyerDataSection title="Company & Firm Info" icon={<Building2 className="w-4 h-4 text-muted-foreground" />}>
                <DataGrid columns={2}>
                  <DataField label="Buyer Company Name" value={buyer.platform_company_name} />
                  <DataField label="PE / Parent Firm" value={buyer.pe_firm_name} />
                  <DataField label="Buyer Website" value={buyer.platform_website} type="url" />
                  <DataField label="PE Firm Website" value={buyer.pe_firm_website} type="url" />
                  <DataField label="Buyer LinkedIn" value={buyer.buyer_linkedin} type="url" />
                  <DataField label="PE Firm LinkedIn" value={buyer.pe_firm_linkedin} type="url" />
                  <DataField label="Fee Agreement" value={buyer.fee_agreement_status !== 'None' ? buyer.fee_agreement_status : null} />
                </DataGrid>
              </BuyerDataSection>

              {/* 2. Headquarter Address */}
              <BuyerDataSection title="Headquarter Address" icon={<MapPin className="w-4 h-4 text-muted-foreground" />}>
                <div className="space-y-4">
                  {/* Prominent full address display */}
                  {(buyer.hq_city || buyer.hq_state || buyer.hq_country) && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-lg font-medium">
                        {[buyer.hq_city, buyer.hq_state, buyer.hq_country].filter(Boolean).join(", ")}
                      </p>
                      {buyer.hq_region && <p className="text-sm text-muted-foreground mt-1">Region: {buyer.hq_region}</p>}
                    </div>
                  )}
                  <DataListField label="Other Office Locations" items={buyer.other_office_locations} collapsible collapsedCount={5} />
                  <DataListField label="Service Regions" items={buyer.service_regions?.length ? buyer.service_regions : buyer.geographic_footprint} collapsible collapsedCount={5} />
                </div>
              </BuyerDataSection>

              {/* 3. Business Description */}
              <BuyerDataSection title="Business Description" icon={<Briefcase className="w-4 h-4 text-muted-foreground" />}>
                <div className="space-y-4">
                  <DataField label="Primary Services / Products" value={buyer.services_offered} />
                  <DataField label="Industry Vertical" value={buyer.industry_vertical} />
                  <DataField label="Business Summary" value={buyer.business_summary} />
                  <DataField label="Specialized Focus" value={buyer.specialized_focus} />
                  <DataField label="Business Type" value={buyer.business_type || buyer.business_model} />
                </div>
              </BuyerDataSection>

              {/* 4. Investment Criteria Summary - Elevated */}
              <BuyerDataSection title="Investment Criteria Summary" icon={<Target className="w-4 h-4 text-muted-foreground" />}>
                <div className="space-y-4">
                  {buyer.thesis_summary && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <p className="text-xs text-primary uppercase tracking-wide font-semibold mb-2">Investment Thesis</p>
                      <p className="text-sm">{buyer.thesis_summary}</p>
                      {buyer.thesis_confidence && (
                        <Badge variant={buyer.thesis_confidence === "high" ? "default" : "outline"} className="mt-2">
                          {buyer.thesis_confidence} confidence
                        </Badge>
                      )}
                    </div>
                  )}
                  <DataField label="Strategic Priorities" value={buyer.strategic_priorities} />
                  <DataField label="Acquisition Appetite" value={buyer.acquisition_appetite} />
                  <DataField label="Acquisition Timeline" value={buyer.acquisition_timeline} />
                  <DataListField label="Target Services" items={buyer.target_services} />
                  <DataListField label="Required Capabilities" items={buyer.required_capabilities} />
                  <DataListField label="Deal Breakers" items={buyer.deal_breakers} variant="destructive" />
                </div>
              </BuyerDataSection>

              {/* 5. Geographic Footprint - Standalone */}
              <BuyerDataSection title="Geographic Footprint" icon={<Globe className="w-4 h-4 text-muted-foreground" />}>
                <div className="space-y-4">
                  <DataListField label="Current Locations" items={buyer.geographic_footprint} variant="default" collapsible collapsedCount={5} />
                  <DataListField label="Service Regions" items={buyer.service_regions} variant="default" collapsible collapsedCount={5} />
                  <DataListField label="Target Geographies" items={buyer.target_geographies} variant="outline" collapsible collapsedCount={5} />
                  <DataListField label="Geographic Exclusions" items={buyer.geographic_exclusions} variant="destructive" />
                  <DataListField label="Target Industries" items={buyer.target_industries} collapsible collapsedCount={5} />
                  <DataListField label="Industry Exclusions" items={buyer.industry_exclusions} variant="destructive" />
                </div>
              </BuyerDataSection>

              {/* 6. Deal Structure */}
              <BuyerDataSection title="Deal Structure" icon={<DollarSign className="w-4 h-4 text-muted-foreground" />}>
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Size Criteria</p>
                  <DataGrid columns={3}>
                    <DataField label="Min Revenue" value={buyer.min_revenue} type="currency" />
                    <DataField label="Max Revenue" value={buyer.max_revenue} type="currency" />
                    <DataField label="Revenue Sweet Spot" value={buyer.revenue_sweet_spot} type="currency" />
                  </DataGrid>
                  <DataGrid columns={3}>
                    <DataField label="Min EBITDA" value={buyer.min_ebitda} type="currency" />
                    <DataField label="Max EBITDA" value={buyer.max_ebitda} type="currency" />
                    <DataField label="EBITDA Sweet Spot" value={buyer.ebitda_sweet_spot} type="currency" />
                  </DataGrid>
                  <DataField label="Target EBITDA %" value={buyer.preferred_ebitda} type="percentage" />
                  
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Deal Preferences</p>
                    <DataField label="Business Model Preferences" value={buyer.business_model_prefs} />
                    <DataListField label="Business Model Exclusions" items={buyer.business_model_exclusions} variant="destructive" />
                    <div className="flex gap-3 mt-3 flex-wrap">
                      {buyer.addon_only && <Badge variant="secondary">Add-on Only</Badge>}
                      {buyer.platform_only && <Badge variant="secondary">Platform Only</Badge>}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Ownership Structure</p>
                    <DataField label="Owner Roll Requirement" value={buyer.owner_roll_requirement} />
                    <DataField label="Owner Transition Goals" value={buyer.owner_transition_goals} />
                  </div>
                </div>
              </BuyerDataSection>

              {/* 7. Customer/End Market Info */}
              <BuyerDataSection title="Customer / End Market Info" icon={<Users className="w-4 h-4 text-muted-foreground" />}>
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Current Customers</p>
                  <DataGrid columns={2}>
                    <DataField label="Primary Customer Size" value={buyer.primary_customer_size} />
                    <DataField label="Customer Geographic Reach" value={buyer.customer_geographic_reach} />
                  </DataGrid>
                  <DataListField label="Customer Industries" items={buyer.customer_industries} />
                  
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Target Customer Profile</p>
                    <DataField label="Target Customer Profile" value={buyer.target_customer_profile} />
                    <DataGrid columns={2}>
                      <DataField label="Target Customer Size" value={buyer.target_customer_size} />
                      <DataField label="Target Customer Geography" value={buyer.target_customer_geography} />
                    </DataGrid>
                    <DataListField label="Target Customer Industries" items={buyer.target_customer_industries} />
                  </div>
                </div>
              </BuyerDataSection>

              {/* 8. Platform Acquisition History */}
              <BuyerDataSection title="Platform Acquisition History" icon={<History className="w-4 h-4 text-muted-foreground" />}>
                <div className="space-y-4">
                  {/* Prominent Last Acquisition Date */}
                  {buyer.last_acquisition_date && (
                    <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Platform Acquisition</p>
                        <p className="text-lg font-semibold">{new Date(buyer.last_acquisition_date).toLocaleDateString()}</p>
                      </div>
                      <History className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <DataGrid columns={2}>
                    <DataField label="Total Platform Add-ons" value={buyer.total_acquisitions} />
                    <DataField label="Acquisition Frequency" value={buyer.acquisition_frequency} />
                  </DataGrid>
                  {recentAcqs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Recent Platform Acquisitions</p>
                      <div className="space-y-2">
                        {recentAcqs.map((acq: any, i: number) => (
                          <div key={i} className="text-sm p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium">{acq.name || acq.company || "Unknown"}</p>
                                {acq.date && <p className="text-xs text-muted-foreground">{acq.date}</p>}
                                {acq.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{acq.location}</p>}
                                {acq.description && <p className="text-xs text-muted-foreground mt-1">{acq.description}</p>}
                              </div>
                              {acq.source_url && (
                                <a 
                                  href={acq.source_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Source
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </BuyerDataSection>

              {/* Key Quotes */}
              {buyer.key_quotes?.length > 0 && (
                <BuyerDataSection title="Key Quotes" icon={<Quote className="w-4 h-4 text-muted-foreground" />} className="lg:col-span-2">
                  <div className="space-y-3">
                    {buyer.key_quotes.map((quote: string, i: number) => (
                      <blockquote key={i} className="border-l-2 border-primary/50 pl-4 py-1 text-sm italic text-muted-foreground">
                        "{quote}"
                      </blockquote>
                    ))}
                  </div>
                </BuyerDataSection>
              )}

              {/* Call Transcripts - Enhanced with AI Processing */}
              <BuyerDataSection title="Transcripts & Call Intelligence" icon={<FileText className="w-4 h-4 text-muted-foreground" />} className="lg:col-span-2">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Dialog open={transcriptDialogOpen} onOpenChange={setTranscriptDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Transcript</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Add Call Transcript</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div>
                            <Label>Title *</Label>
                            <Input value={newTranscript.title} onChange={(e) => setNewTranscript({ ...newTranscript, title: e.target.value })} placeholder="e.g., Q1 2024 Buyer Call" className="mt-1" />
                          </div>
                          <div>
                            <Label>Call Date</Label>
                            <Input type="date" value={newTranscript.call_date} onChange={(e) => setNewTranscript({ ...newTranscript, call_date: e.target.value })} className="mt-1" />
                          </div>
                          <div>
                            <Label>Transcript Link</Label>
                            <Input value={newTranscript.url} onChange={(e) => setNewTranscript({ ...newTranscript, url: e.target.value })} placeholder="https://..." className="mt-1" />
                          </div>
                          <div>
                            <Label>Notes / Transcript Content</Label>
                            <Textarea value={newTranscript.notes} onChange={(e) => setNewTranscript({ ...newTranscript, notes: e.target.value })} placeholder="Paste transcript content or key takeaways from this call... (required for AI processing)" className="mt-1" rows={6} />
                            <p className="text-xs text-muted-foreground mt-1">Tip: Paste the full transcript here for best AI extraction results.</p>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={addTranscriptLink} disabled={!newTranscript.title.trim()} className="flex-1">
                              <Link2 className="w-4 h-4 mr-2" />Add Transcript
                            </Button>
                          </div>
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or upload file</span></div>
                          </div>
                          <div>
                            <Label htmlFor="transcript-upload" className="cursor-pointer">
                              <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                                {isUploading ? (<Loader2 className="w-6 h-6 animate-spin mx-auto" />) : (
                                  <><Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Click to upload transcript file</p></>
                                )}
                              </div>
                            </Label>
                            <input id="transcript-upload" type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt,.md" />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {transcripts.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No transcripts linked yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {transcripts.map((t) => {
                        const status = getTranscriptStatus(t);
                        const isExpanded = expandedTranscripts.has(t.id);
                        const extractedData = t.extracted_data || {};
                        const hasExtractedData = Object.keys(extractedData).length > 0;

                        return (
                          <div key={t.id} className="bg-muted/50 rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {t.url ? (
                                      <a href={getTranscriptUrl(t)} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary hover:underline truncate">{t.title}</a>
                                    ) : (
                                      <span className="font-medium truncate">{t.title}</span>
                                    )}
                                    {status === 'extracted' && (
                                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 shrink-0">
                                        <CheckCircle className="w-3 h-3 mr-1" />Extracted
                                      </Badge>
                                    )}
                                    {status === 'processing' && (
                                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 shrink-0">
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing
                                      </Badge>
                                    )}
                                    {status === 'pending' && (
                                      <Badge variant="outline" className="shrink-0">
                                        <Clock className="w-3 h-3 mr-1" />Pending
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {t.call_date && <span>{new Date(t.call_date).toLocaleDateString()}</span>}
                                    <Badge variant="outline" className="text-xs">{t.transcript_type === "file" ? "Uploaded" : "Link"}</Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {status === 'pending' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => processTranscriptWithAI(t.id, false)}
                                    disabled={processingTranscripts.has(t.id)}
                                  >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Process AI
                                  </Button>
                                )}
                                {status === 'extracted' && (
                                  <>
                                    <Button 
                                      variant="default" 
                                      size="sm" 
                                      onClick={() => processTranscriptWithAI(t.id, true)}
                                      disabled={processingTranscripts.has(t.id)}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Apply to Profile
                                    </Button>
                                    {hasExtractedData && (
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => toggleTranscriptExpanded(t.id)}
                                      >
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </Button>
                                    )}
                                  </>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => deleteTranscript(t)} className="text-muted-foreground hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Expanded extracted data preview */}
                            {isExpanded && hasExtractedData && (
                              <div className="border-t px-4 py-3 bg-background/50">
                                <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Extracted Data Preview</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  {extractedData.thesis_summary && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">Investment Thesis</p>
                                      <p className="text-sm">{extractedData.thesis_summary}</p>
                                    </div>
                                  )}
                                  {extractedData.target_geographies?.length > 0 && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">Target Geographies</p>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {extractedData.target_geographies.map((g: string, i: number) => (
                                          <Badge key={i} variant="secondary" className="text-xs">{g}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {(extractedData.min_revenue || extractedData.max_revenue) && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">Revenue Range</p>
                                      <p className="text-sm">${extractedData.min_revenue || '?'}M - ${extractedData.max_revenue || '?'}M</p>
                                    </div>
                                  )}
                                  {(extractedData.min_ebitda || extractedData.max_ebitda) && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">EBITDA Range</p>
                                      <p className="text-sm">${extractedData.min_ebitda || '?'}M - ${extractedData.max_ebitda || '?'}M</p>
                                    </div>
                                  )}
                                  {extractedData.deal_breakers?.length > 0 && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">Deal Breakers</p>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {extractedData.deal_breakers.map((d: string, i: number) => (
                                          <Badge key={i} variant="destructive" className="text-xs">{d}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {extractedData.key_quotes?.length > 0 && (
                                    <div className="md:col-span-2">
                                      <p className="text-xs text-muted-foreground mb-2">Key Quotes ({extractedData.key_quotes.length})</p>
                                      <div className="space-y-1">
                                        {extractedData.key_quotes.slice(0, 3).map((q: string, i: number) => (
                                          <blockquote key={i} className="border-l-2 border-primary/30 pl-2 text-xs italic text-muted-foreground">
                                            "{q}"
                                          </blockquote>
                                        ))}
                                        {extractedData.key_quotes.length > 3 && (
                                          <p className="text-xs text-muted-foreground">...and {extractedData.key_quotes.length - 3} more</p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {t.notes && !isExpanded && (
                              <div className="px-4 pb-3">
                                <p className="text-xs text-muted-foreground line-clamp-2">{t.notes}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </BuyerDataSection>
            </div>
          </TabsContent>

          {/* Intelligence Tab (editable) */}
          <TabsContent value="intelligence" className="space-y-4">
            <div className="bg-card rounded-lg border p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">Edit Buyer Intelligence</h2>
                {isEditing && <Button onClick={saveIntelligence}>Save All Changes</Button>}
                {!isEditing && <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Edit className="w-4 h-4 mr-2" />Start Editing</Button>}
              </div>
              
              {!isEditing ? (
                <p className="text-muted-foreground">Click "Start Editing" to update buyer intelligence across all categories.</p>
              ) : (
                <div className="space-y-8">
                  {/* A. Company & Firm Identification */}
                  <div className="space-y-4">
                    <h3 className="font-semibold border-b pb-2">A. Company & Firm Identification</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Buyer LinkedIn</Label><Input value={editData.buyer_linkedin || ""} onChange={(e) => setEditData({ ...editData, buyer_linkedin: e.target.value })} placeholder="https://linkedin.com/company/..." className="mt-1" /></div>
                      <div><Label>PE Firm LinkedIn</Label><Input value={editData.pe_firm_linkedin || ""} onChange={(e) => setEditData({ ...editData, pe_firm_linkedin: e.target.value })} placeholder="https://linkedin.com/company/..." className="mt-1" /></div>
                    </div>
                  </div>

                  {/* B. Location & Geography */}
                  <div className="space-y-4">
                    <h3 className="font-semibold border-b pb-2">B. Location & Geography</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>HQ Country</Label><Input value={editData.hq_country || ""} onChange={(e) => setEditData({ ...editData, hq_country: e.target.value })} className="mt-1" /></div>
                      <div><Label>HQ Region</Label><Input value={editData.hq_region || ""} onChange={(e) => setEditData({ ...editData, hq_region: e.target.value })} placeholder="e.g., Southeast, Midwest" className="mt-1" /></div>
                    </div>
                    <div><Label>Other Office Locations (comma-separated)</Label><Input value={Array.isArray(editData.other_office_locations) ? editData.other_office_locations.join(", ") : editData.other_office_locations || ""} onChange={(e) => setEditData({ ...editData, other_office_locations: e.target.value })} className="mt-1" /></div>
                    <div><Label>Acquisition Geography (comma-separated)</Label><Input value={Array.isArray(editData.acquisition_geography) ? editData.acquisition_geography.join(", ") : editData.acquisition_geography || ""} onChange={(e) => setEditData({ ...editData, acquisition_geography: e.target.value })} className="mt-1" /></div>
                    <div><Label>Target Geographies (comma-separated)</Label><Input value={Array.isArray(editData.target_geographies) ? editData.target_geographies.join(", ") : editData.target_geographies || ""} onChange={(e) => setEditData({ ...editData, target_geographies: e.target.value })} className="mt-1" /></div>
                    <div><Label>Geographic Exclusions (comma-separated)</Label><Input value={Array.isArray(editData.geographic_exclusions) ? editData.geographic_exclusions.join(", ") : editData.geographic_exclusions || ""} onChange={(e) => setEditData({ ...editData, geographic_exclusions: e.target.value })} className="mt-1" /></div>
                  </div>

                  {/* C. Business Description */}
                  <div className="space-y-4">
                    <h3 className="font-semibold border-b pb-2">C. Business Description</h3>
                    <div><Label>Industry Vertical</Label><Input value={editData.industry_vertical || ""} onChange={(e) => setEditData({ ...editData, industry_vertical: e.target.value })} className="mt-1" /></div>
                    <div><Label>Business Summary</Label><Textarea value={editData.business_summary || ""} onChange={(e) => setEditData({ ...editData, business_summary: e.target.value })} rows={3} className="mt-1" /></div>
                    <div><Label>Specialized Focus</Label><Input value={editData.specialized_focus || ""} onChange={(e) => setEditData({ ...editData, specialized_focus: e.target.value })} className="mt-1" /></div>
                  </div>

                  {/* D. Customer Profile */}
                  <div className="space-y-4">
                    <h3 className="font-semibold border-b pb-2">D. Customer Profile</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Primary Customer Size</Label><Input value={editData.primary_customer_size || ""} onChange={(e) => setEditData({ ...editData, primary_customer_size: e.target.value })} placeholder="e.g., SMB, Mid-market, Enterprise" className="mt-1" /></div>
                      <div><Label>Customer Geographic Reach</Label><Input value={editData.customer_geographic_reach || ""} onChange={(e) => setEditData({ ...editData, customer_geographic_reach: e.target.value })} className="mt-1" /></div>
                    </div>
                    <div><Label>Customer Industries (comma-separated)</Label><Input value={Array.isArray(editData.customer_industries) ? editData.customer_industries.join(", ") : editData.customer_industries || ""} onChange={(e) => setEditData({ ...editData, customer_industries: e.target.value })} className="mt-1" /></div>
                    <div><Label>Target Customer Profile</Label><Textarea value={editData.target_customer_profile || ""} onChange={(e) => setEditData({ ...editData, target_customer_profile: e.target.value })} rows={2} className="mt-1" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Target Customer Size</Label><Input value={editData.target_customer_size || ""} onChange={(e) => setEditData({ ...editData, target_customer_size: e.target.value })} className="mt-1" /></div>
                      <div><Label>Target Customer Geography</Label><Input value={editData.target_customer_geography || ""} onChange={(e) => setEditData({ ...editData, target_customer_geography: e.target.value })} className="mt-1" /></div>
                    </div>
                    <div><Label>Target Customer Industries (comma-separated)</Label><Input value={Array.isArray(editData.target_customer_industries) ? editData.target_customer_industries.join(", ") : editData.target_customer_industries || ""} onChange={(e) => setEditData({ ...editData, target_customer_industries: e.target.value })} className="mt-1" /></div>
                  </div>

                  {/* E. Business Model */}
                  <div className="space-y-4">
                    <h3 className="font-semibold border-b pb-2">E. Business Model</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Business Type</Label><Input value={editData.business_type || ""} onChange={(e) => setEditData({ ...editData, business_type: e.target.value })} className="mt-1" /></div>
                      <div><Label>Revenue Model</Label><Input value={editData.revenue_model || ""} onChange={(e) => setEditData({ ...editData, revenue_model: e.target.value })} placeholder="e.g., Recurring, Project-based" className="mt-1" /></div>
                    </div>
                    <div><Label>Go-to-Market Strategy</Label><Textarea value={editData.go_to_market_strategy || ""} onChange={(e) => setEditData({ ...editData, go_to_market_strategy: e.target.value })} rows={2} className="mt-1" /></div>
                    <div><Label>Target Business Model</Label><Input value={editData.target_business_model || ""} onChange={(e) => setEditData({ ...editData, target_business_model: e.target.value })} className="mt-1" /></div>
                    <div><Label>Business Model Preferences</Label><Input value={editData.business_model_prefs || ""} onChange={(e) => setEditData({ ...editData, business_model_prefs: e.target.value })} className="mt-1" /></div>
                    <div><Label>Business Model Exclusions (comma-separated)</Label><Input value={Array.isArray(editData.business_model_exclusions) ? editData.business_model_exclusions.join(", ") : editData.business_model_exclusions || ""} onChange={(e) => setEditData({ ...editData, business_model_exclusions: e.target.value })} className="mt-1" /></div>
                  </div>

                  {/* F. Size Criteria */}
                  <div className="space-y-4">
                    <h3 className="font-semibold border-b pb-2">F. Size Criteria</h3>
                    <p className="text-sm text-muted-foreground">Revenue (in $M)</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div><Label>Min Revenue</Label><Input type="number" value={editData.min_revenue || ""} onChange={(e) => setEditData({ ...editData, min_revenue: e.target.value })} className="mt-1" /></div>
                      <div><Label>Max Revenue</Label><Input type="number" value={editData.max_revenue || ""} onChange={(e) => setEditData({ ...editData, max_revenue: e.target.value })} className="mt-1" /></div>
                      <div><Label>Revenue Sweet Spot</Label><Input type="number" value={editData.revenue_sweet_spot || ""} onChange={(e) => setEditData({ ...editData, revenue_sweet_spot: e.target.value })} className="mt-1" /></div>
                    </div>
                    <p className="text-sm text-muted-foreground">EBITDA (in $M or %)</p>
                    <div className="grid grid-cols-4 gap-4">
                      <div><Label>Min EBITDA ($M)</Label><Input type="number" value={editData.min_ebitda || ""} onChange={(e) => setEditData({ ...editData, min_ebitda: e.target.value })} className="mt-1" /></div>
                      <div><Label>Max EBITDA ($M)</Label><Input type="number" value={editData.max_ebitda || ""} onChange={(e) => setEditData({ ...editData, max_ebitda: e.target.value })} className="mt-1" /></div>
                      <div><Label>EBITDA Sweet Spot ($M)</Label><Input type="number" value={editData.ebitda_sweet_spot || ""} onChange={(e) => setEditData({ ...editData, ebitda_sweet_spot: e.target.value })} className="mt-1" /></div>
                      <div><Label>Target EBITDA %</Label><Input type="number" value={editData.preferred_ebitda || ""} onChange={(e) => setEditData({ ...editData, preferred_ebitda: e.target.value })} className="mt-1" /></div>
                    </div>
                  </div>

                  {/* G. Acquisition History */}
                  <div className="space-y-4">
                    <h3 className="font-semibold border-b pb-2">G. Acquisition History</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div><Label>Total Acquisitions</Label><Input type="number" value={editData.total_acquisitions || ""} onChange={(e) => setEditData({ ...editData, total_acquisitions: e.target.value })} className="mt-1" /></div>
                      <div><Label>Acquisition Frequency</Label><Input value={editData.acquisition_frequency || ""} onChange={(e) => setEditData({ ...editData, acquisition_frequency: e.target.value })} placeholder="e.g., 2-3 per year" className="mt-1" /></div>
                      <div><Label>Last Acquisition Date</Label><Input type="date" value={editData.last_acquisition_date || ""} onChange={(e) => setEditData({ ...editData, last_acquisition_date: e.target.value })} className="mt-1" /></div>
                    </div>
                  </div>

                  {/* H. Investment Criteria */}
                  <div className="space-y-4">
                    <h3 className="font-semibold border-b pb-2">H. Investment Criteria</h3>
                    <div><Label>Investment Thesis Summary</Label><Textarea value={editData.thesis_summary || ""} onChange={(e) => setEditData({ ...editData, thesis_summary: e.target.value })} placeholder="What is this buyer looking for?" rows={4} className="mt-1" /></div>
                    <div><Label>Service Mix Preferences</Label><Input value={editData.service_mix_prefs || ""} onChange={(e) => setEditData({ ...editData, service_mix_prefs: e.target.value })} className="mt-1" /></div>
                    <div><Label>Target Services (comma-separated)</Label><Input value={Array.isArray(editData.target_services) ? editData.target_services.join(", ") : editData.target_services || ""} onChange={(e) => setEditData({ ...editData, target_services: e.target.value })} className="mt-1" /></div>
                    <div><Label>Required Capabilities (comma-separated)</Label><Input value={Array.isArray(editData.required_capabilities) ? editData.required_capabilities.join(", ") : editData.required_capabilities || ""} onChange={(e) => setEditData({ ...editData, required_capabilities: e.target.value })} className="mt-1" /></div>
                    <div><Label>Target Industries (comma-separated)</Label><Input value={Array.isArray(editData.target_industries) ? editData.target_industries.join(", ") : editData.target_industries || ""} onChange={(e) => setEditData({ ...editData, target_industries: e.target.value })} className="mt-1" /></div>
                    <div><Label>Industry Exclusions (comma-separated)</Label><Input value={Array.isArray(editData.industry_exclusions) ? editData.industry_exclusions.join(", ") : editData.industry_exclusions || ""} onChange={(e) => setEditData({ ...editData, industry_exclusions: e.target.value })} className="mt-1" /></div>
                    <div><Label>Deal Breakers (comma-separated)</Label><Input value={Array.isArray(editData.deal_breakers) ? editData.deal_breakers.join(", ") : editData.deal_breakers || ""} onChange={(e) => setEditData({ ...editData, deal_breakers: e.target.value })} className="mt-1" /></div>
                    <div><Label>Strategic Priorities</Label><Textarea value={editData.strategic_priorities || ""} onChange={(e) => setEditData({ ...editData, strategic_priorities: e.target.value })} rows={2} className="mt-1" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Acquisition Appetite</Label><Input value={editData.acquisition_appetite || ""} onChange={(e) => setEditData({ ...editData, acquisition_appetite: e.target.value })} placeholder="e.g., Aggressive, Selective" className="mt-1" /></div>
                      <div><Label>Acquisition Timeline / Goals</Label><Input value={editData.acquisition_timeline || ""} onChange={(e) => setEditData({ ...editData, acquisition_timeline: e.target.value })} className="mt-1" /></div>
                    </div>
                    
                    <p className="text-sm font-semibold text-muted-foreground pt-2">Ownership</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Owner Roll Requirement</Label><Input value={editData.owner_roll_requirement || ""} onChange={(e) => setEditData({ ...editData, owner_roll_requirement: e.target.value })} placeholder="e.g., Required, Preferred, Optional" className="mt-1" /></div>
                      <div><Label>Owner Transition Goals</Label><Input value={editData.owner_transition_goals || ""} onChange={(e) => setEditData({ ...editData, owner_transition_goals: e.target.value })} className="mt-1" /></div>
                    </div>
                    
                    <div><Label>Key Quotes (one per line)</Label><Textarea value={Array.isArray(editData.key_quotes) ? editData.key_quotes.join("\n") : editData.key_quotes || ""} onChange={(e) => setEditData({ ...editData, key_quotes: e.target.value })} placeholder="Direct quotes from calls..." rows={4} className="mt-1" /></div>
                  </div>

                  <Button onClick={saveIntelligence} className="w-full">Save All Changes</Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-4">
            <BuyerDataSection title="Contacts" icon={<User className="w-4 h-4 text-muted-foreground" />} isEmpty={contacts.length === 0} emptyMessage="No contacts added yet.">
              <div className="divide-y">
                {contacts.map((c) => (
                  <div key={c.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-sm text-muted-foreground">{c.title}</p>
                      </div>
                      {c.priority_level && <Badge variant="outline">Priority {c.priority_level}</Badge>}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {c.email && <span>{c.email}</span>}
                      {c.phone && <span>{c.phone}</span>}
                      {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn</a>}
                    </div>
                  </div>
                ))}
              </div>
            </BuyerDataSection>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
