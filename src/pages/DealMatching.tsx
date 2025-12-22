import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScoreBadge } from "@/components/ScoreBadge";
import { IntelligenceBadge } from "@/components/IntelligenceBadge";
import { Loader2, ArrowLeft, ChevronDown, ChevronRight, Building2, Globe, DollarSign, ExternalLink, FileCheck, CheckCircle2, Mail, Linkedin, UserSearch, User, MapPin, Users, Phone, Send, AlertTriangle, XCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PassReasonDialog } from "@/components/PassReasonDialog";

interface CategoryScore {
  score: number;
  reasoning: string;
  isDisqualified: boolean;
  disqualificationReason: string | null;
  confidence: 'high' | 'medium' | 'low';
}

interface BuyerScore {
  buyerId: string;
  buyerName: string;
  compositeScore: number;
  sizeScore: CategoryScore;
  geographyScore: CategoryScore;
  servicesScore: CategoryScore;
  ownerGoalsScore: CategoryScore;
  thesisBonus: number;
  overallReasoning: string;
  isDisqualified: boolean;
  disqualificationReasons: string[];
  dataCompleteness: 'high' | 'medium' | 'low';
  dealAttractiveness: number;
}

export default function DealMatching() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deal, setDeal] = useState<any>(null);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [buyerScores, setBuyerScores] = useState<Map<string, BuyerScore>>(new Map());
  const [contacts, setContacts] = useState<Record<string, any[]>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isScoringLoading, setIsScoringLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [contactedStatus, setContactedStatus] = useState<Record<string, boolean>>({});
  const [hideDisqualified, setHideDisqualified] = useState(false);
  const [passDialogOpen, setPassDialogOpen] = useState(false);
  const [buyerToPass, setBuyerToPass] = useState<any>(null);
  const [dealAttractiveness, setDealAttractiveness] = useState<number>(50);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const { data: dealData } = await supabase.from("deals").select("*").eq("id", id).single();
    setDeal(dealData);
    if (dealData) {
      const { data: buyersData } = await supabase.from("buyers").select("*").eq("tracker_id", dealData.tracker_id);
      setBuyers(buyersData || []);
      
      // Fetch contacts for all buyers
      const buyerIds = (buyersData || []).map(b => b.id);
      if (buyerIds.length > 0) {
        const { data: contactsData } = await supabase.from("buyer_contacts").select("*").in("buyer_id", buyerIds);
        const contactsByBuyer: Record<string, any[]> = {};
        (contactsData || []).forEach(c => {
          if (!contactsByBuyer[c.buyer_id]) contactsByBuyer[c.buyer_id] = [];
          contactsByBuyer[c.buyer_id].push(c);
        });
        setContacts(contactsByBuyer);
      }
      
      // Get AI-powered scores from new edge function
      setIsScoringLoading(true);
      try {
        const { data: scoreData, error: scoreError } = await supabase.functions.invoke('score-buyer-deal', {
          body: { dealId: id }
        });
        
        if (scoreError) {
          console.error("Scoring error:", scoreError);
          toast({ title: "Scoring error", description: scoreError.message, variant: "destructive" });
        } else if (scoreData?.scores) {
          const scoreMap = new Map<string, BuyerScore>();
          scoreData.scores.forEach((s: BuyerScore) => {
            scoreMap.set(s.buyerId, s);
          });
          setBuyerScores(scoreMap);
          setDealAttractiveness(scoreData.dealAttractiveness || 50);
          console.log(`Loaded ${scoreData.scores.length} AI scores for deal ${scoreData.dealName}`);
        }
      } catch (err) {
        console.error("Failed to get AI scores:", err);
      }
      setIsScoringLoading(false);
      
      // Also load existing scores from DB (for selected_for_outreach, passed, etc.)
      const { data: scoresData } = await supabase.from("buyer_deal_scores").select("*").eq("deal_id", id);
      if (scoresData?.length) {
        setScores(scoresData);
        const approved = new Set(scoresData.filter(s => s.selected_for_outreach).map(s => s.buyer_id));
        setSelected(approved);
      }
    }
    setIsLoading(false);
  };

  // Merge AI scores with buyer data and sort
  const sortedBuyers = buyers.map((b) => {
    const dbScore = scores.find((s) => s.buyer_id === b.id);
    const aiScore = buyerScores.get(b.id);
    
    // Use AI scores if available, fallback to DB scores
    const compositeScore = aiScore?.compositeScore ?? dbScore?.composite_score ?? 50;
    const isDisqualified = aiScore?.isDisqualified ?? false;
    const fitReasoning = aiScore?.overallReasoning ?? dbScore?.fit_reasoning ?? "";
    
    return {
      ...b,
      score: {
        ...dbScore,
        geography_score: aiScore?.geographyScore?.score ?? dbScore?.geography_score ?? 50,
        service_score: aiScore?.servicesScore?.score ?? dbScore?.service_score ?? 50,
        acquisition_score: aiScore?.sizeScore?.score ?? dbScore?.acquisition_score ?? 50, // Size score
        portfolio_score: aiScore?.ownerGoalsScore?.score ?? dbScore?.portfolio_score ?? 50, // Owner goals
        thesis_bonus: aiScore?.thesisBonus ?? dbScore?.thesis_bonus ?? 0,
        composite_score: compositeScore,
        fit_reasoning: fitReasoning,
      },
      aiScore,
      isDisqualified,
      disqualificationReason: aiScore?.disqualificationReasons?.[0] ?? null,
    };
  }).sort((a, b) => {
    if (a.isDisqualified && !b.isDisqualified) return 1;
    if (!a.isDisqualified && b.isDisqualified) return -1;
    return (b.score?.composite_score || 0) - (a.score?.composite_score || 0);
  });
  
  const qualifiedBuyers = sortedBuyers.filter(b => !b.isDisqualified);
  const disqualifiedBuyers = sortedBuyers.filter(b => b.isDisqualified);
  const displayBuyers = hideDisqualified ? qualifiedBuyers : sortedBuyers;
  const approvedBuyers = sortedBuyers.filter(b => b.score?.selected_for_outreach && !b.score?.passed_on_deal);
  const passedBuyers = sortedBuyers.filter(b => b.score?.passed_on_deal);
  const allBuyers = displayBuyers;

  const toggleSelect = (buyerId: string) => {
    const newSet = new Set(selected);
    newSet.has(buyerId) ? newSet.delete(buyerId) : newSet.add(buyerId);
    setSelected(newSet);
  };

  const approveBuyers = async () => {
    if (selected.size === 0) return;
    const selectedArray = Array.from(selected);
    
    // Update scores to mark as approved
    const updates = selectedArray.map(buyerId => 
      supabase.from("buyer_deal_scores").update({ selected_for_outreach: true }).eq("deal_id", id).eq("buyer_id", buyerId)
    );
    await Promise.all(updates);
    setScores(scores.map(s => selected.has(s.buyer_id) ? { ...s, selected_for_outreach: true } : s));
    
    // Trigger contact discovery for each approved buyer
    toast({ title: `${selected.size} buyers approved. Finding contacts...` });
    
    for (const buyerId of selectedArray) {
      const buyer = buyers.find(b => b.id === buyerId);
      if (buyer) {
        supabase.functions.invoke('find-buyer-contacts', {
          body: { 
            buyerId, 
            platformCompanyName: buyer.platform_company_name,
            dealId: id 
          }
        }).then(({ data, error }) => {
          if (error) {
            console.error(`Contact discovery failed for ${buyer.platform_company_name || buyer.pe_firm_name}:`, error);
          } else if (data?.success) {
            console.log(`Found ${data.contacts_inserted} contacts for ${buyer.platform_company_name || buyer.pe_firm_name}`);
            // Reload contacts
            loadData();
          }
        });
      }
    }
  };

  const handleMarkAsPassed = async (category: string, reason: string, notes: string) => {
    if (!buyerToPass || !id) return;
    
    const { error } = await supabase
      .from("buyer_deal_scores")
      .update({
        passed_on_deal: true,
        pass_category: category,
        pass_reason: reason,
        pass_notes: notes,
        passed_at: new Date().toISOString(),
      })
      .eq("deal_id", id)
      .eq("buyer_id", buyerToPass.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setScores(scores.map(s => 
      s.buyer_id === buyerToPass.id 
        ? { ...s, passed_on_deal: true, pass_category: category, pass_reason: reason, pass_notes: notes, passed_at: new Date().toISOString() }
        : s
    ));
    toast({ title: "Buyer marked as passed", description: `${buyerToPass.platform_company_name || buyerToPass.pe_firm_name} - ${reason}` });
  };

  const openPassDialog = (buyer: any) => {
    setBuyerToPass(buyer);
    setPassDialogOpen(true);
  };

  const handleInterestedToggle = async (buyer: any, interested: boolean) => {
    const { error } = await supabase
      .from("buyer_deal_scores")
      .update({
        interested,
        interested_at: new Date().toISOString(),
      })
      .eq("deal_id", id)
      .eq("buyer_id", buyer.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setScores(scores.map(s => 
      s.buyer_id === buyer.id 
        ? { ...s, interested, interested_at: new Date().toISOString() }
        : s
    ));
    toast({ 
      title: interested ? "Marked as interested" : "Marked as not interested",
      description: buyer.platform_company_name || buyer.pe_firm_name
    });
  };

  const getHQ = (buyer: any) => {
    if (buyer.hq_city && buyer.hq_state) return `${buyer.hq_city}, ${buyer.hq_state}`;
    if (buyer.hq_state) return buyer.hq_state;
    return null;
  };

  const getServiceLocations = (buyer: any) => {
    const regions = buyer.service_regions?.length ? buyer.service_regions : buyer.geographic_footprint;
    return regions?.length ? regions : null;
  };

  const getOfficeLocations = (buyer: any) => {
    const locations: string[] = [];
    if (buyer.hq_city && buyer.hq_state) {
      locations.push(`${buyer.hq_city}, ${buyer.hq_state}`);
    } else if (buyer.hq_city) {
      locations.push(buyer.hq_city);
    } else if (buyer.hq_state) {
      locations.push(buyer.hq_state);
    }
    if (buyer.other_office_locations?.length) {
      locations.push(...buyer.other_office_locations);
    }
    return locations.length ? locations : null;
  };

  const formatRevenue = (buyer: any) => {
    if (buyer.min_revenue && buyer.max_revenue) return `$${buyer.min_revenue}M-$${buyer.max_revenue}M`;
    if (buyer.min_revenue) return `$${buyer.min_revenue}M+`;
    if (buyer.max_revenue) return `Up to $${buyer.max_revenue}M`;
    return null;
  };

  const getServicesSummary = (buyer: any) => {
    if (!buyer.services_offered) return null;
    const firstSentence = buyer.services_offered.split(/[.;]/)[0];
    return firstSentence.length > 120 ? firstSentence.substring(0, 120) + '...' : firstSentence;
  };

  const getPlatformLinkedIn = (buyer: any) => {
    return buyer.buyer_linkedin || null;
  };

  const getPEFirmLinkedIn = (buyer: any) => {
    return buyer.pe_firm_linkedin || null;
  };

  const getPlatformWebsite = (buyer: any) => {
    if (buyer.platform_website) {
      return buyer.platform_website.startsWith('http') ? buyer.platform_website : `https://${buyer.platform_website}`;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(buyer.platform_company_name || buyer.pe_firm_name)}`;
  };

  const hasFeeAgreement = (buyer: any) => buyer.fee_agreement_status && buyer.fee_agreement_status !== 'None';

  const getBuyerContacts = (buyerId: string) => contacts[buyerId] || [];
  
  const getContactsByType = (buyerId: string, companyType: string) => {
    return getBuyerContacts(buyerId).filter(c => c.company_type === companyType);
  };

  // Removed mock contacts - now using real contact discovery

  const generateEmailBody = (buyer: any, contactName: string) => {
    const subject = encodeURIComponent(`Introduction: ${deal?.deal_name || 'Acquisition Opportunity'}`);
    const body = encodeURIComponent(
      `Hi ${contactName.split(' ')[0]},\n\n` +
      `I wanted to reach out regarding a potential acquisition opportunity that may align with ${buyer.platform_company_name || buyer.pe_firm_name}'s investment thesis.\n\n` +
      `Deal Overview:\n` +
      `• Company: ${deal?.deal_name || 'Confidential'}\n` +
      `• Industry: ${deal?.industry_type || 'Professional Services'}\n` +
      `• Geography: ${deal?.geography?.join(', ') || 'TBD'}\n` +
      `• Revenue: $${deal?.revenue || 'TBD'}M\n` +
      `• EBITDA Margin: ${deal?.ebitda_percentage || 'TBD'}%\n` +
      `• Services: ${deal?.service_mix || 'TBD'}\n\n` +
      `Would you have time for a brief call to discuss?\n\n` +
      `Best regards`
    );
    return `mailto:?subject=${subject}&body=${body}`;
  };

  const renderContactSection = (buyer: any, companyType: string, companyName: string) => {
    const typeContacts = getContactsByType(buyer.id, companyType);
    // Sort by priority_level and is_deal_team
    const sortedContacts = [...typeContacts].sort((a, b) => {
      if (a.is_deal_team && !b.is_deal_team) return -1;
      if (!a.is_deal_team && b.is_deal_team) return 1;
      return (a.priority_level || 99) - (b.priority_level || 99);
    });
    
    const hasContacts = sortedContacts.length > 0;
    const hasDealTeam = sortedContacts.some(c => c.is_deal_team);
    
    const handleFindContacts = async (e: React.MouseEvent) => {
      e.stopPropagation();
      toast({ title: "Finding contacts...", description: `Scanning ${companyName} website` });
      
      const { data, error } = await supabase.functions.invoke('find-buyer-contacts', {
        body: { 
          buyerId: buyer.id, 
          platformCompanyName: buyer.platform_company_name,
          dealId: id 
        }
      });
      
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else if (data?.success) {
        toast({ 
          title: "Contacts found", 
          description: `Added ${data.contacts_inserted} new contacts from ${companyName}`
        });
        loadData();
      }
    };
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            {companyName}
            {hasDealTeam && (
              <Badge className="text-[10px] h-4 ml-1 bg-green-500/20 text-green-600 border-green-500/30">
                Deal Team Found
              </Badge>
            )}
            {hasContacts && !hasDealTeam && (
              <Badge variant="secondary" className="text-[10px] h-4 ml-1">
                {sortedContacts.length} contact{sortedContacts.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs"
            onClick={handleFindContacts}
          >
            <UserSearch className="w-3 h-3 mr-1" />
            {hasContacts ? 'Refresh' : 'Find Contacts'}
          </Button>
        </div>
        
        {!hasContacts && (
          <div className="text-xs text-muted-foreground italic py-2 px-3 bg-muted/30 rounded">
            No contacts found yet. Click "Find Contacts" to scan the website.
          </div>
        )}
        
        <div className="space-y-2">
          {sortedContacts.map((contact: any) => (
            <div key={contact.id} className="bg-muted/50 rounded px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{contact.name}</span>
                    {contact.title && <span className="text-xs text-muted-foreground">{contact.title}</span>}
                    {contact.is_deal_team && (
                      <Badge className="text-[9px] h-4 bg-primary/20 text-primary border-primary/30">
                        Deal Team
                      </Badge>
                    )}
                    {contact.role_category && contact.role_category !== 'other' && !contact.is_deal_team && (
                      <Badge variant="outline" className="text-[9px] h-4 capitalize">
                        {contact.role_category.replace(/_/g, ' ')}
                      </Badge>
                    )}
                    {contact.source === 'website' && (
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                        <Globe className="w-2.5 h-2.5" /> Website
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-muted-foreground">Contacted</span>
                  <Switch
                    checked={contactedStatus[contact.id] || false}
                    onCheckedChange={(checked) => {
                      setContactedStatus(prev => ({ ...prev, [contact.id]: checked }));
                      toast({ 
                        title: checked ? "Marked as contacted" : "Marked as not contacted",
                        description: contact.name
                      });
                    }}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 pl-5 text-xs text-muted-foreground">
                {contact.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {contact.email}
                  </span>
                )}
                {contact.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {contact.phone}
                  </span>
                )}
                {contact.linkedin_url && (
                  <a 
                    href={contact.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    <Linkedin className="w-3 h-3" />
                    LinkedIn
                  </a>
                )}
              </div>
              <div className="flex gap-2 pl-5">
                {contact.email && (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = generateEmailBody(buyer, contact.name);
                    }}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Send Email
                  </Button>
                )}
                {contact.linkedin_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(contact.linkedin_url, '_blank');
                    }}
                  >
                    <Linkedin className="w-3 h-3 mr-1" />
                    Message
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBuyerRow = (buyer: any, showCheckbox = true, showContacts = false, showPassButton = false) => {
    const score = buyer.score;
    const isExpanded = expanded.has(buyer.id);
    const isApproved = score?.selected_for_outreach && !score?.passed_on_deal;
    const isPassed = score?.passed_on_deal;
    const buyerContacts = getBuyerContacts(buyer.id);

    return (
      <div key={buyer.id} className="p-4">
        <div className="flex items-start gap-4">
          {showCheckbox && (
            <Checkbox checked={selected.has(buyer.id)} onCheckedChange={() => toggleSelect(buyer.id)} className="mt-1" />
          )}
          <Collapsible open={isExpanded} onOpenChange={() => { const e = new Set(expanded); isExpanded ? e.delete(buyer.id) : e.add(buyer.id); setExpanded(e); }} className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/buyers/${buyer.id}?dealId=${id}`} className="font-semibold hover:text-primary transition-colors">
                    {buyer.platform_company_name || buyer.pe_firm_name}
                  </Link>
                  <a href={getPlatformWebsite(buyer)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary" title="Visit website">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {getPlatformLinkedIn(buyer) && (
                    <a href={getPlatformLinkedIn(buyer)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#0077b5]" title="LinkedIn">
                      <Linkedin className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {buyer.isDisqualified && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />Disqualified
                    </Badge>
                  )}
                  {isPassed && (
                    <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                      <XCircle className="w-3 h-3 mr-1" />Passed
                    </Badge>
                  )}
                  {isApproved && !buyer.isDisqualified && !isPassed && (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />Approved
                    </Badge>
                  )}
                  {score?.interested === true && (
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                      <ThumbsUp className="w-3 h-3 mr-1" />Interested
                    </Badge>
                  )}
                  {score?.interested === false && (
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                      <ThumbsDown className="w-3 h-3 mr-1" />Not Interested
                    </Badge>
                  )}
                  {hasFeeAgreement(buyer) && (
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                      <FileCheck className="w-3 h-3 mr-1" />Fee Agreement
                    </Badge>
                  )}
                </div>
                
                {/* HQ City/State below name */}
                {(buyer.hq_city || buyer.hq_state) && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {[buyer.hq_city, buyer.hq_state].filter(Boolean).join(", ")}
                  </p>
                )}
                
                {/* Clickable Website URLs */}
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  {buyer.platform_website && (
                    <a 
                      href={getPlatformWebsite(buyer)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" />
                      {buyer.platform_website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  )}
                  {buyer.pe_firm_website && (
                    <a 
                      href={buyer.pe_firm_website.startsWith('http') ? buyer.pe_firm_website : `https://${buyer.pe_firm_website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      <Building2 className="w-3 h-3" />
                      {buyer.pe_firm_website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  )}
                </div>
                
                {/* PE Firm info with LinkedIn */}
                {buyer.platform_company_name && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Building2 className="w-3 h-3" />
                    <span>{buyer.pe_firm_name}</span>
                    {getPEFirmLinkedIn(buyer) && (
                      <a href={getPEFirmLinkedIn(buyer)} target="_blank" rel="noopener noreferrer" className="hover:text-[#0077b5]" title="PE Firm LinkedIn">
                        <Linkedin className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
                
                {/* Services/Business description - 3 lines */}
                {(buyer.services_offered || buyer.business_summary) && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{buyer.services_offered || buyer.business_summary}</p>
                )}
                
                {/* Additional Info */}
                <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground flex-wrap">
                  {getServiceLocations(buyer) && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Serves: {getServiceLocations(buyer).slice(0, 4).join(", ")}{getServiceLocations(buyer).length > 4 ? ` +${getServiceLocations(buyer).length - 4} more` : ''}</span>
                    </span>
                  )}
                  {formatRevenue(buyer) && (
                    <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{formatRevenue(buyer)}</span>
                  )}
                  {buyerContacts.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <User className="w-3 h-3 mr-1" />{buyerContacts.length} contact{buyerContacts.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="flex items-center gap-3">
                  <IntelligenceBadge buyer={buyer} size="sm" />
                  <ScoreBadge score={score?.composite_score || 0} showLabel />
                  <CollapsibleTrigger asChild><Button variant="ghost" size="sm">{isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</Button></CollapsibleTrigger>
                </div>
                
                {/* Action buttons for approved buyers - visible without expanding */}
                {showPassButton && !isPassed && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1.5 border rounded-md px-2 py-1">
                      <span className="text-xs text-muted-foreground">Interested:</span>
                      <Button
                        variant={score?.interested === true ? "default" : "ghost"}
                        size="sm"
                        className={`h-6 w-6 p-0 ${score?.interested === true ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleInterestedToggle(buyer, true); }}
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant={score?.interested === false ? "default" : "ghost"}
                        size="sm"
                        className={`h-6 w-6 p-0 ${score?.interested === false ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleInterestedToggle(buyer, false); }}
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={(e) => { e.stopPropagation(); openPassDialog(buyer); }}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Pass
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Detailed Fit Explanation - Always visible */}
            <div className={`mt-3 p-3 rounded-lg text-sm ${buyer.isDisqualified ? 'bg-destructive/10 border border-destructive/20' : score?.composite_score >= 70 ? 'bg-green-500/10 border border-green-500/20' : 'bg-muted/50'}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className={`font-medium ${buyer.isDisqualified ? 'text-destructive' : score?.composite_score >= 70 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                    {score?.fit_reasoning || "Evaluating fit..."}
                  </p>
                  
                  {/* Detailed breakdown - 4 AI-scored categories */}
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center justify-between bg-background/50 rounded px-2 py-1">
                      <span className="text-muted-foreground">Size</span>
                      <span className={`font-semibold ${(score?.acquisition_score || 0) >= 70 ? 'text-green-600' : (score?.acquisition_score || 0) >= 40 ? 'text-amber-600' : 'text-destructive'}`}>
                        {score?.acquisition_score || 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-background/50 rounded px-2 py-1">
                      <span className="text-muted-foreground">Geography</span>
                      <span className={`font-semibold ${(score?.geography_score || 0) >= 70 ? 'text-green-600' : (score?.geography_score || 0) >= 40 ? 'text-amber-600' : 'text-destructive'}`}>
                        {score?.geography_score || 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-background/50 rounded px-2 py-1">
                      <span className="text-muted-foreground">Services</span>
                      <span className={`font-semibold ${(score?.service_score || 0) >= 70 ? 'text-green-600' : (score?.service_score || 0) >= 40 ? 'text-amber-600' : 'text-destructive'}`}>
                        {score?.service_score || 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-background/50 rounded px-2 py-1">
                      <span className="text-muted-foreground">Owner Goals</span>
                      <span className={`font-semibold ${(score?.portfolio_score || 0) >= 70 ? 'text-green-600' : (score?.portfolio_score || 0) >= 40 ? 'text-amber-600' : 'text-destructive'}`}>
                        {score?.portfolio_score || 0}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Geographic details */}
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium">Buyer footprint: </span>
                    {getServiceLocations(buyer)?.slice(0, 6).join(", ") || buyer.hq_state || "Unknown"}
                    {getServiceLocations(buyer)?.length > 6 && ` +${getServiceLocations(buyer).length - 6} more`}
                    <span className="mx-2">→</span>
                    <span className="font-medium">Deal: </span>
                    {deal?.geography?.join(", ") || deal?.headquarters || "Unknown"}
                  </div>
                  
                  {/* Disqualification reason if applicable */}
                  {buyer.disqualificationReason && (
                    <p className="mt-2 text-xs text-destructive font-medium">
                      ⚠️ {buyer.disqualificationReason}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <CollapsibleContent className="mt-4 pl-0 space-y-4">
              {/* Contacts Section - Only shown in Approved tab */}
              {showContacts && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <User className="w-4 h-4" /> Contacts
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {renderContactSection(buyer, "PE Firm", buyer.pe_firm_name)}
                    {buyer.platform_company_name && renderContactSection(buyer, "Platform", buyer.platform_company_name)}
                  </div>
                </div>
              )}
              
              {/* Pass reason if buyer passed */}
              {isPassed && score?.pass_reason && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-medium text-destructive">Pass Reason: {score.pass_reason}</p>
                  {score.pass_notes && (
                    <p className="text-xs text-muted-foreground mt-1">{score.pass_notes}</p>
                  )}
                </div>
              )}
              
              {buyer.thesis_summary && (
                <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">"{buyer.thesis_summary}"</p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    );
  };

  if (isLoading) return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">Buyer Matches</h1>
            <p className="text-muted-foreground">{deal?.deal_name} · {buyers.length} buyers scored</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={approveBuyers} disabled={selected.size === 0}>Approve Buyers as Fit ({selected.size})</Button>
            {approvedBuyers.length > 0 && (
              <Button variant="outline" onClick={() => navigate(`/deals/${id}/introductions`)}>Track Outreach</Button>
            )}
          </div>
        </div>

        <div className="bg-accent/10 rounded-lg border border-accent/20 p-4 flex flex-wrap gap-4 md:gap-6 text-sm items-center">
          <span>✅ {qualifiedBuyers.length} qualified buyers</span>
          <span className="text-destructive">❌ {disqualifiedBuyers.length} disqualified (no nearby presence)</span>
          <span>🎯 {qualifiedBuyers.filter(b => (b.score?.composite_score || 0) >= 70).length} strong matches (&gt;70%)</span>
          <span>✓ {approvedBuyers.length} approved</span>
          {passedBuyers.length > 0 && <span className="text-destructive">✗ {passedBuyers.length} passed</span>}
          <label className="flex items-center gap-2 ml-auto cursor-pointer">
            <Switch 
              checked={hideDisqualified} 
              onCheckedChange={setHideDisqualified}
              className="data-[state=checked]:bg-primary"
            />
            <span className="text-xs text-muted-foreground">Hide disqualified</span>
          </label>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Buyers ({allBuyers.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedBuyers.length})</TabsTrigger>
            <TabsTrigger value="passed">Passed ({passedBuyers.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <div className="bg-card rounded-lg border divide-y">
              {allBuyers.map((buyer) => renderBuyerRow(buyer, true, false, false))}
            </div>
          </TabsContent>
          <TabsContent value="approved" className="mt-4">
            <div className="bg-card rounded-lg border divide-y">
              {approvedBuyers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No buyers approved yet. Select buyers and click "Approve Buyers as Fit".</div>
              ) : (
                approvedBuyers.map((buyer) => renderBuyerRow(buyer, false, true, true))
              )}
            </div>
          </TabsContent>
          <TabsContent value="passed" className="mt-4">
            <div className="bg-card rounded-lg border divide-y">
              {passedBuyers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No buyers have passed on this deal yet.</div>
              ) : (
                passedBuyers.map((buyer) => renderBuyerRow(buyer, false, false, false))
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Pass Reason Dialog */}
        <PassReasonDialog
          open={passDialogOpen}
          onOpenChange={setPassDialogOpen}
          buyerName={buyerToPass?.platform_company_name || buyerToPass?.pe_firm_name || ""}
          dealName={deal?.deal_name || ""}
          onConfirm={handleMarkAsPassed}
        />
      </div>
    </AppLayout>
  );
}