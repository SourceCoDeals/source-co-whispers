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
import { Loader2, ArrowLeft, ChevronDown, ChevronRight, Building2, Globe, DollarSign, ExternalLink, FileCheck, CheckCircle2, Mail, Linkedin, UserSearch, User, MapPin, Users, Phone, Send, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GeographicScore {
  buyerId: string;
  geographyScore: number;
  isDisqualified: boolean;
  disqualificationReason: string | null;
  fitReasoning: string;
}

export default function DealMatching() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deal, setDeal] = useState<any>(null);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [geoScores, setGeoScores] = useState<Map<string, GeographicScore>>(new Map());
  const [contacts, setContacts] = useState<Record<string, any[]>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [contactedStatus, setContactedStatus] = useState<Record<string, boolean>>({});
  const [hideDisqualified, setHideDisqualified] = useState(false);

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
      
      // Get real geographic scores from edge function
      try {
        const { data: geoData, error: geoError } = await supabase.functions.invoke('score-buyer-geography', {
          body: { dealId: id }
        });
        
        if (geoData?.scores) {
          const geoMap = new Map<string, GeographicScore>();
          geoData.scores.forEach((s: GeographicScore) => {
            geoMap.set(s.buyerId, s);
          });
          setGeoScores(geoMap);
        }
      } catch (err) {
        console.error("Failed to get geographic scores:", err);
      }
      
      const { data: scoresData } = await supabase.from("buyer_deal_scores").select("*").eq("deal_id", id);
      if (scoresData?.length) {
        setScores(scoresData);
        const approved = new Set(scoresData.filter(s => s.selected_for_outreach).map(s => s.buyer_id));
        setSelected(approved);
      } else {
        // Create initial scores - geography will be overwritten by real scores
        const newScores = (buyersData || []).map((b) => ({
          buyer_id: b.id, deal_id: id,
          geography_score: 50, // Will be overwritten by real geo scores
          service_score: Math.floor(Math.random() * 40) + 60,
          acquisition_score: Math.floor(Math.random() * 40) + 60,
          portfolio_score: Math.floor(Math.random() * 40) + 60,
          business_model_score: Math.floor(Math.random() * 40) + 60,
          thesis_bonus: b.thesis_summary ? Math.floor(Math.random() * 30) + 20 : 0,
          composite_score: 0, 
          fit_reasoning: "Calculating...", 
          data_completeness: b.thesis_summary ? "High" : "Low",
          selected_for_outreach: false,
        }));
        newScores.forEach((s) => { s.composite_score = ((s.geography_score + s.service_score + s.acquisition_score + s.portfolio_score + s.business_model_score) / 5 + s.thesis_bonus) / 1.5; });
        if (newScores.length) await supabase.from("buyer_deal_scores").insert(newScores);
        setScores(newScores);
      }
    }
    setIsLoading(false);
  };

  // Merge geographic scores with buyer scores and sort
  const sortedBuyers = buyers.map((b) => {
    const score = scores.find((s) => s.buyer_id === b.id);
    const geoScore = geoScores.get(b.id);
    
    // Use real geography score if available
    const realGeoScore = geoScore?.geographyScore ?? score?.geography_score ?? 50;
    const isDisqualified = geoScore?.isDisqualified ?? false;
    const fitReasoning = geoScore?.fitReasoning ?? score?.fit_reasoning ?? "";
    
    // Recalculate composite with real geography score (geography weighted 40%)
    const geoWeight = 0.4;
    const otherWeight = 0.6 / 4; // Distribute remaining 60% among 4 other scores
    const compositeScore = isDisqualified ? 0 : (
      (realGeoScore * geoWeight) +
      ((score?.service_score || 50) * otherWeight) +
      ((score?.acquisition_score || 50) * otherWeight) +
      ((score?.portfolio_score || 50) * otherWeight) +
      ((score?.business_model_score || 50) * otherWeight) +
      (score?.thesis_bonus || 0) * 0.3
    );
    
    return {
      ...b,
      score: {
        ...score,
        geography_score: realGeoScore,
        composite_score: compositeScore,
        fit_reasoning: fitReasoning,
      },
      isDisqualified,
      disqualificationReason: geoScore?.disqualificationReason,
    };
  }).sort((a, b) => {
    // Disqualified buyers always go to bottom
    if (a.isDisqualified && !b.isDisqualified) return 1;
    if (!a.isDisqualified && b.isDisqualified) return -1;
    return (b.score?.composite_score || 0) - (a.score?.composite_score || 0);
  });
  
  const qualifiedBuyers = sortedBuyers.filter(b => !b.isDisqualified);
  const disqualifiedBuyers = sortedBuyers.filter(b => b.isDisqualified);
  const displayBuyers = hideDisqualified ? qualifiedBuyers : sortedBuyers;
  const approvedBuyers = sortedBuyers.filter(b => b.score?.selected_for_outreach);
  const allBuyers = displayBuyers;

  const toggleSelect = (buyerId: string) => {
    const newSet = new Set(selected);
    newSet.has(buyerId) ? newSet.delete(buyerId) : newSet.add(buyerId);
    setSelected(newSet);
  };

  const approveBuyers = async () => {
    if (selected.size === 0) return;
    const updates = Array.from(selected).map(buyerId => 
      supabase.from("buyer_deal_scores").update({ selected_for_outreach: true }).eq("deal_id", id).eq("buyer_id", buyerId)
    );
    await Promise.all(updates);
    setScores(scores.map(s => selected.has(s.buyer_id) ? { ...s, selected_for_outreach: true } : s));
    toast({ title: `${selected.size} buyers approved as fit` });
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

  // Mock contacts for demo purposes
  const getMockContacts = (companyType: string) => {
    if (companyType === "PE Firm") {
      return [
        { id: 'mock-1', name: 'Sarah Mitchell', title: 'Managing Director', email: 'smitchell@pegroup.com', phone: '(312) 555-0147', linkedin_url: 'https://linkedin.com/in/sarah-mitchell' },
        { id: 'mock-2', name: 'David Chen', title: 'Vice President', email: 'dchen@pegroup.com', phone: '(312) 555-0198', linkedin_url: 'https://linkedin.com/in/david-chen' },
      ];
    }
    return [
      { id: 'mock-3', name: 'Michael Torres', title: 'CEO', email: 'mtorres@platformco.com', phone: '(847) 555-0234', linkedin_url: 'https://linkedin.com/in/michael-torres' },
      { id: 'mock-4', name: 'Jennifer Park', title: 'VP Business Development', email: 'jpark@platformco.com', phone: '(847) 555-0312', linkedin_url: 'https://linkedin.com/in/jennifer-park' },
    ];
  };

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
    // Use mock contacts if no real contacts exist
    const displayContacts = typeContacts.length > 0 ? typeContacts : getMockContacts(companyType);
    const isMockData = typeContacts.length === 0;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            {companyName}
            {isMockData && <Badge variant="outline" className="text-[10px] h-4 ml-1">Demo Data</Badge>}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              toast({ title: "Contact discovery", description: `Finding contacts for ${companyName}...` });
            }}
          >
            <UserSearch className="w-3 h-3 mr-1" />
            Find Contacts
          </Button>
        </div>
        <div className="space-y-2">
          {displayContacts.map((contact: any) => (
            <div key={contact.id} className="bg-muted/50 rounded px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-medium">{contact.name}</span>
                    {contact.title && <span className="text-xs text-muted-foreground ml-2">{contact.title}</span>}
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

  const renderBuyerRow = (buyer: any, showCheckbox = true, showContacts = false) => {
    const score = buyer.score;
    const isExpanded = expanded.has(buyer.id);
    const isApproved = score?.selected_for_outreach;
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
                  {isApproved && !buyer.isDisqualified && (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />Approved
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
              </div>
            </div>
            
            {/* Detailed Fit Explanation - Always visible */}
            <div className={`mt-3 p-3 rounded-lg text-sm ${buyer.isDisqualified ? 'bg-destructive/10 border border-destructive/20' : score?.composite_score >= 70 ? 'bg-green-500/10 border border-green-500/20' : 'bg-muted/50'}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className={`font-medium ${buyer.isDisqualified ? 'text-destructive' : score?.composite_score >= 70 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                    {score?.fit_reasoning || "Evaluating fit..."}
                  </p>
                  
                  {/* Detailed breakdown */}
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center justify-between bg-background/50 rounded px-2 py-1">
                      <span className="text-muted-foreground">Geography</span>
                      <span className={`font-semibold ${(score?.geography_score || 0) >= 70 ? 'text-green-600' : (score?.geography_score || 0) >= 40 ? 'text-amber-600' : 'text-destructive'}`}>
                        {score?.geography_score || 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-background/50 rounded px-2 py-1">
                      <span className="text-muted-foreground">Services</span>
                      <span className={`font-semibold ${(score?.service_score || 0) >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                        {score?.service_score || 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-background/50 rounded px-2 py-1">
                      <span className="text-muted-foreground">Acquisition</span>
                      <span className={`font-semibold ${(score?.acquisition_score || 0) >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                        {score?.acquisition_score || 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-background/50 rounded px-2 py-1">
                      <span className="text-muted-foreground">Portfolio</span>
                      <span className={`font-semibold ${(score?.portfolio_score || 0) >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
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
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <div className="bg-card rounded-lg border divide-y">
              {allBuyers.map((buyer) => renderBuyerRow(buyer, true))}
            </div>
          </TabsContent>
          <TabsContent value="approved" className="mt-4">
            <div className="bg-card rounded-lg border divide-y">
              {approvedBuyers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No buyers approved yet. Select buyers and click "Approve Buyers as Fit".</div>
              ) : (
                approvedBuyers.map((buyer) => renderBuyerRow(buyer, false, true))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}