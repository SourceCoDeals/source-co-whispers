import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Users, ExternalLink, FileText, Calendar, Building2, DollarSign, MapPin, Target, User, Phone, Mail, Briefcase, Clock, Hash, Linkedin, Sparkles, AlertTriangle, MessageSquareWarning } from "lucide-react";
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

        {/* Attachments & Actions - Moved to top */}
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Attachments & Actions</h2>
          </div>
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
            <Button onClick={() => navigate(`/deals/${id}/matching`)}>
              <Users className="w-4 h-4 mr-2" />View Buyer Matches
            </Button>
            <Button variant="outline" onClick={() => navigate(`/deals/${id}/introductions`)}>
              Track Introductions
            </Button>
          </div>
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
                <div>
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
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Headquarters</p>
                  <p className={deal.headquarters ? "font-medium" : "text-muted-foreground italic"}>{deal.headquarters || "Not specified"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Founded</p>
                  <p className={deal.founded_year ? "font-medium" : "text-muted-foreground italic"}>{deal.founded_year || "Not specified"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Employees</p>
                  <p className={deal.employee_count ? "font-medium" : "text-muted-foreground italic"}>{deal.employee_count ? `${deal.employee_count}+` : "Not specified"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Industry</p>
                  <p className={deal.industry_type ? "font-medium" : "text-muted-foreground italic"}>{deal.industry_type || "Not specified"}</p>
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
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Revenue</p>
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
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">EBITDA Margin</p>
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
                    {/* Show calculated EBITDA amount */}
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
          </div>
        </div>

        {/* Row 2: Executive Summary */}
        <div className="bg-card rounded-lg border p-6 space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Executive Summary</h2>
          </div>
          <p className={deal.company_overview ? "text-sm leading-relaxed" : "text-sm text-muted-foreground italic"}>{deal.company_overview || "No executive summary available"}</p>
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
          </div>

          {/* Geographic Coverage */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <MapPin className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Geographic Coverage</h2>
            </div>
            {deal.geography?.length > 0 ? (
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
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Name</p>
                  <p className={deal.contact_name ? "font-medium" : "text-muted-foreground italic"}>{deal.contact_name || "Not specified"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Email</p>
                  {deal.contact_email ? (
                    <a href={`mailto:${deal.contact_email}`} className="text-primary hover:underline">{deal.contact_email}</a>
                  ) : (
                    <p className="text-muted-foreground italic">Not specified</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Phone</p>
                  {deal.contact_phone ? (
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
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">LinkedIn</p>
                  {deal.contact_linkedin ? (
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
          <p className={deal.additional_info ? "text-sm" : "text-sm text-muted-foreground italic"}>{deal.additional_info || "No additional information"}</p>
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
