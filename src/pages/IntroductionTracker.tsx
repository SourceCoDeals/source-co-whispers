import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, ArrowLeft, ChevronDown, ChevronRight, Mail, Linkedin, Plus, Building2, FileCheck, UserPlus, ExternalLink, MapPin, DollarSign, AlertTriangle, Target, User, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const stages = ["Not Started", "Initial Contact", "Connected", "NDA Sent", "NDA Signed", "IOI", "LOI", "Due Diligence", "Closed", "Dead"];

const employeeOptions = ["Unassigned", "John Smith", "Sarah Johnson", "Mike Williams", "Emily Davis", "Chris Brown"];

export default function IntroductionTracker() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deal, setDeal] = useState<any>(null);
  const [approvedBuyers, setApprovedBuyers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<Record<string, any[]>>({});
  const [outreachRecords, setOutreachRecords] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addContactOpen, setAddContactOpen] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({ name: "", email: "", title: "", linkedin_url: "", phone: "", company_type: "PE Firm" });

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const { data: dealData } = await supabase.from("deals").select("*").eq("id", id).single();
    setDeal(dealData);
    
    if (dealData) {
      const { data: scoresData } = await supabase.from("buyer_deal_scores").select("*, buyers(*)").eq("deal_id", id).eq("selected_for_outreach", true);
      const buyersWithScores = scoresData?.map(s => ({ ...s.buyers, score: s })) || [];
      setApprovedBuyers(buyersWithScores);

      if (buyersWithScores.length > 0) {
        const buyerIds = buyersWithScores.map(b => b.id);
        const { data: contactsData } = await supabase.from("buyer_contacts").select("*").in("buyer_id", buyerIds);
        const contactMap: Record<string, any[]> = {};
        contactsData?.forEach(c => {
          if (!contactMap[c.buyer_id]) contactMap[c.buyer_id] = [];
          contactMap[c.buyer_id].push(c);
        });
        setContacts(contactMap);

        const { data: outreachData } = await supabase.from("outreach_records").select("*").eq("deal_id", id).in("buyer_id", buyerIds);
        const outreachMap: Record<string, any> = {};
        outreachData?.forEach(r => { outreachMap[r.buyer_id] = r; });
        setOutreachRecords(outreachMap);
      }
    }
    setIsLoading(false);
  };

  const updateStage = async (buyerId: string, stage: string) => {
    const existing = outreachRecords[buyerId];
    if (existing) {
      await supabase.from("outreach_records").update({ deal_stage: stage, last_activity_date: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("outreach_records").insert({ buyer_id: buyerId, deal_id: id, deal_stage: stage });
    }
    toast({ title: "Stage updated" });
    loadData();
  };

  const updateEmployeeOwner = async (buyerId: string, owner: string) => {
    const ownerValue = owner === "Unassigned" ? null : owner;
    await supabase.from("buyers").update({ employee_owner: ownerValue }).eq("id", buyerId);
    toast({ title: "Owner assigned" });
    loadData();
  };

  const addContact = async (buyerId: string) => {
    if (!newContact.name.trim()) return;
    await supabase.from("buyer_contacts").insert({ buyer_id: buyerId, ...newContact });
    toast({ title: "Contact added" });
    setNewContact({ name: "", email: "", title: "", linkedin_url: "", phone: "", company_type: "PE Firm" });
    setAddContactOpen(null);
    loadData();
  };

  const generateEmailDraft = (buyer: any, contact: any) => {
    const subject = encodeURIComponent(`Investment Opportunity - ${deal?.deal_name}`);
    const platformName = buyer.platform_company_name || buyer.pe_firm_name;
    
    const body = encodeURIComponent(`Hi ${contact.name.split(' ')[0]},

I hope this message finds you well. I'm reaching out because we have a deal that I believe would be a strong fit for ${platformName}.

Deal Overview:
• Company: ${deal?.deal_name}
• Industry: ${deal?.industry_type || 'N/A'}
• Geography: ${deal?.geography?.join(', ') || 'N/A'}
• Revenue: ${deal?.revenue ? `$${deal.revenue}M` : 'N/A'}
• EBITDA: ${deal?.ebitda_percentage ? `${deal.ebitda_percentage}%` : 'N/A'}
${deal?.service_mix ? `• Services: ${deal.service_mix}` : ''}

Based on your investment thesis and current portfolio, we think this could be a compelling add-on opportunity.

Would you be open to a brief call to discuss?

Best regards`);

    return `mailto:${contact.email}?subject=${subject}&body=${body}`;
  };

  const hasFeeAgreement = (buyer: any) => buyer.fee_agreement_status && buyer.fee_agreement_status !== 'None';

  const formatRevenue = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min && max) return `$${min}-${max}M Rev`;
    if (min) return `$${min}M+ Rev`;
    return `Up to $${max}M Rev`;
  };

  const formatEbitda = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min && max) return `$${min}-${max}M EBITDA`;
    if (min) return `$${min}M+ EBITDA`;
    return `Up to $${max}M EBITDA`;
  };

  const getStageColor = (stage: string) => {
    if (stage === "Dead") return "bg-destructive/10 text-destructive border-destructive/30";
    if (stage === "Closed") return "bg-green-500/10 text-green-600 border-green-500/30";
    if (["IOI", "LOI", "Due Diligence"].includes(stage)) return "bg-blue-500/10 text-blue-600 border-blue-500/30";
    if (["Connected", "NDA Sent", "NDA Signed"].includes(stage)) return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    return "";
  };

  const stats = {
    total: approvedBuyers.length,
    introduced: Object.values(outreachRecords).filter((r: any) => r.deal_stage !== "Not Started").length,
    withContacts: approvedBuyers.filter(b => contacts[b.id]?.length > 0).length,
    withFeeAgreement: approvedBuyers.filter(b => hasFeeAgreement(b)).length,
    assigned: approvedBuyers.filter(b => b.employee_owner).length,
  };

  const stageCounts = stages.reduce((acc, stage) => {
    acc[stage] = Object.values(outreachRecords).filter((r: any) => r.deal_stage === stage).length;
    return acc;
  }, {} as Record<string, number>);
  stageCounts["Not Started"] = stats.total - stats.introduced;

  if (isLoading) return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">Outreach Tracker</h1>
            <p className="text-muted-foreground">{deal?.deal_name} · {approvedBuyers.length} approved buyers</p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/deals/${id}/matching`)}>Manage Approved Buyers</Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Introduced</p>
            <p className="text-2xl font-bold">{stats.introduced}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Have Contacts</p>
            <p className="text-2xl font-bold">{stats.withContacts}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Fee Agreements</p>
            <p className="text-2xl font-bold">{stats.withFeeAgreement}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Assigned</p>
            <p className="text-2xl font-bold">{stats.assigned}</p>
          </div>
        </div>

        {/* Pipeline by Stage */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-medium mb-3">Pipeline by Stage</h3>
          <div className="flex gap-2 flex-wrap">
            {stages.map(stage => {
              const count = stageCounts[stage] || 0;
              if (count === 0) return null;
              return (
                <Badge key={stage} variant="outline" className={`${getStageColor(stage)}`}>
                  {stage}: {count}
                </Badge>
              );
            })}
          </div>
        </div>

        {approvedBuyers.length === 0 ? (
          <div className="bg-card rounded-lg border p-8 text-center">
            <p className="text-muted-foreground mb-4">No approved buyers yet.</p>
            <Button onClick={() => navigate(`/deals/${id}/matching`)}>Approve Buyers</Button>
          </div>
        ) : (
          <div className="bg-card rounded-lg border divide-y">
            {approvedBuyers.map((buyer) => {
              const buyerContacts = contacts[buyer.id] || [];
              const outreach = outreachRecords[buyer.id];
              const isExpanded = expanded.has(buyer.id);
              const currentStage = outreach?.deal_stage || "Not Started";

              const hqLocation = [buyer.hq_city, buyer.hq_state].filter(Boolean).join(", ");
              const revenueRange = formatRevenue(buyer.min_revenue, buyer.max_revenue);
              const ebitdaRange = formatEbitda(buyer.min_ebitda, buyer.max_ebitda);
              const targetGeos = buyer.target_geographies?.slice(0, 4) || [];
              const lastAcq = buyer.last_acquisition_date ? new Date(buyer.last_acquisition_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null;

              return (
                <div key={buyer.id} className="p-4">
                  <Collapsible open={isExpanded} onOpenChange={() => { const e = new Set(expanded); isExpanded ? e.delete(buyer.id) : e.add(buyer.id); setExpanded(e); }}>
                    {/* Collapsed View - Enhanced */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Row 1: Platform Name + Links + Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link to={`/buyers/${buyer.id}`} className="font-semibold hover:text-primary transition-colors">
                            {buyer.platform_company_name || buyer.pe_firm_name}
                          </Link>
                          {buyer.platform_website ? (
                            <a href={buyer.platform_website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/30" />
                          )}
                          {buyer.employee_owner && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                              <User className="w-3 h-3 mr-1" />{buyer.employee_owner}
                            </Badge>
                          )}
                          {hasFeeAgreement(buyer) && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                              <FileCheck className="w-3 h-3 mr-1" />Fee Agreement
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">{buyerContacts.length} contacts</Badge>
                        </div>

                        {/* Row 2: PE Firm + Location */}
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {buyer.platform_company_name && (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5" />
                              <span>{buyer.pe_firm_name}</span>
                              {buyer.pe_firm_website ? (
                                <a href={buyer.pe_firm_website} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <ExternalLink className="w-3 h-3 text-muted-foreground/30" />
                              )}
                            </div>
                          )}
                          {hqLocation && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{hqLocation}</span>
                            </div>
                          )}
                        </div>

                        {/* Row 3: Size Criteria + Last Acquisition */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {(revenueRange || ebitdaRange) && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              <span>{[revenueRange, ebitdaRange].filter(Boolean).join(" | ")}</span>
                            </div>
                          )}
                          {lastAcq && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Last Acq: {lastAcq}</span>
                            </div>
                          )}
                        </div>

                        {/* Row 4: Target Geographies */}
                        {targetGeos.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {targetGeos.map((geo: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs py-0 h-5">{geo}</Badge>
                            ))}
                            {(buyer.target_geographies?.length || 0) > 4 && (
                              <span className="text-xs text-muted-foreground">+{buyer.target_geographies.length - 4} more</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Side: Stage + Expand */}
                      <div className="flex items-center gap-3 shrink-0">
                        <Select value={currentStage} onValueChange={(v) => updateStage(buyer.id, v)}>
                          <SelectTrigger className={`w-36 ${getStageColor(currentStage)}`}><SelectValue /></SelectTrigger>
                          <SelectContent>{stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">{isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <CollapsibleContent className="mt-4 space-y-4">
                      {/* Quick Intel Section */}
                      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Target className="w-4 h-4" /> Quick Intel
                        </h4>
                        
                        {/* Thesis Summary */}
                        {buyer.thesis_summary && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Thesis</p>
                            <p className="text-sm line-clamp-2">{buyer.thesis_summary}</p>
                          </div>
                        )}

                        {/* Target Services */}
                        {buyer.target_services && buyer.target_services.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Target Services</p>
                            <div className="flex flex-wrap gap-1">
                              {buyer.target_services.slice(0, 6).map((service: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">{service}</Badge>
                              ))}
                              {buyer.target_services.length > 6 && (
                                <span className="text-xs text-muted-foreground">+{buyer.target_services.length - 6} more</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Deal Breakers */}
                        {buyer.deal_breakers && buyer.deal_breakers.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-destructive" /> Deal Breakers
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {buyer.deal_breakers.map((breaker: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">{breaker}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Acquisition Appetite & Timeline */}
                        <div className="flex items-center gap-4 text-sm">
                          {buyer.acquisition_appetite && (
                            <div>
                              <span className="text-muted-foreground">Appetite:</span> <span className="font-medium">{buyer.acquisition_appetite}</span>
                            </div>
                          )}
                          {buyer.acquisition_timeline && (
                            <div>
                              <span className="text-muted-foreground">Timeline:</span> <span className="font-medium">{buyer.acquisition_timeline}</span>
                            </div>
                          )}
                        </div>

                        {/* Employee Owner Assignment */}
                        <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                          <Label className="text-xs text-muted-foreground">Assign Owner:</Label>
                          <Select value={buyer.employee_owner || "Unassigned"} onValueChange={(v) => updateEmployeeOwner(buyer.id, v)}>
                            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {employeeOptions.map((emp) => (
                                <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Contacts Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Contacts</h4>
                          <Dialog open={addContactOpen === buyer.id} onOpenChange={(open) => setAddContactOpen(open ? buyer.id : null)}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm"><UserPlus className="w-3.5 h-3.5 mr-1.5" />Add Contact</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Add Contact for {buyer.platform_company_name || buyer.pe_firm_name}</DialogTitle></DialogHeader>
                              <div className="space-y-4">
                                <div><Label>Name *</Label><Input value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} placeholder="John Smith" className="mt-1" /></div>
                                <div><Label>Title</Label><Input value={newContact.title} onChange={(e) => setNewContact({ ...newContact, title: e.target.value })} placeholder="Managing Director" className="mt-1" /></div>
                                <div><Label>Email</Label><Input type="email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} placeholder="john@example.com" className="mt-1" /></div>
                                <div><Label>LinkedIn URL</Label><Input value={newContact.linkedin_url} onChange={(e) => setNewContact({ ...newContact, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." className="mt-1" /></div>
                                <div><Label>Phone</Label><Input value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} placeholder="+1 555-555-5555" className="mt-1" /></div>
                                <div><Label>Company Type</Label>
                                  <Select value={newContact.company_type} onValueChange={(v) => setNewContact({ ...newContact, company_type: v })}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="PE Firm">PE Firm</SelectItem>
                                      <SelectItem value="Platform Company">Platform Company</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button onClick={() => addContact(buyer.id)} disabled={!newContact.name.trim()} className="w-full">Add Contact</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>

                        {buyerContacts.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">No contacts yet. Add contacts to start outreach.</p>
                        ) : (
                          <div className="grid gap-2">
                            {buyerContacts.map((contact) => (
                              <div key={contact.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div>
                                  <p className="font-medium text-sm">{contact.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {contact.title && <span>{contact.title}</span>}
                                    {contact.company_type && <Badge variant="outline" className="text-xs">{contact.company_type}</Badge>}
                                  </div>
                                  {contact.email && <p className="text-xs text-muted-foreground mt-0.5">{contact.email}</p>}
                                </div>
                                <div className="flex items-center gap-1">
                                  {contact.email && (
                                    <a href={generateEmailDraft(buyer, contact)} className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted" title="Send introduction email">
                                      <Mail className="w-4 h-4" />
                                    </a>
                                  )}
                                  {contact.linkedin_url && (
                                    <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted" title="Open LinkedIn">
                                      <Linkedin className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
