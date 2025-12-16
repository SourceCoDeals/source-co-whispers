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
import { Loader2, ArrowLeft, ChevronDown, ChevronRight, Mail, Linkedin, Plus, Building2, FileCheck, UserPlus, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const stages = ["Not Started", "Initial Contact", "Connected", "NDA Sent", "NDA Signed", "IOI", "LOI", "Due Diligence", "Closed", "Dead"];

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
      // Get approved buyers (selected_for_outreach = true)
      const { data: scoresData } = await supabase.from("buyer_deal_scores").select("*, buyers(*)").eq("deal_id", id).eq("selected_for_outreach", true);
      const buyersWithScores = scoresData?.map(s => ({ ...s.buyers, score: s })) || [];
      setApprovedBuyers(buyersWithScores);

      // Get contacts for all buyers
      if (buyersWithScores.length > 0) {
        const buyerIds = buyersWithScores.map(b => b.id);
        const { data: contactsData } = await supabase.from("buyer_contacts").select("*").in("buyer_id", buyerIds);
        const contactMap: Record<string, any[]> = {};
        contactsData?.forEach(c => {
          if (!contactMap[c.buyer_id]) contactMap[c.buyer_id] = [];
          contactMap[c.buyer_id].push(c);
        });
        setContacts(contactMap);

        // Get outreach records
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

  const stats = {
    total: approvedBuyers.length,
    introduced: Object.values(outreachRecords).filter((r: any) => r.deal_stage !== "Not Started").length,
    withContacts: approvedBuyers.filter(b => contacts[b.id]?.length > 0).length,
    withFeeAgreement: approvedBuyers.filter(b => hasFeeAgreement(b)).length,
  };

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

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border p-4"><p className="text-sm text-muted-foreground">Approved Buyers</p><p className="text-2xl font-bold">{stats.total}</p></div>
          <div className="bg-card rounded-lg border p-4"><p className="text-sm text-muted-foreground">Introduced</p><p className="text-2xl font-bold">{stats.introduced}</p></div>
          <div className="bg-card rounded-lg border p-4"><p className="text-sm text-muted-foreground">Have Contacts</p><p className="text-2xl font-bold">{stats.withContacts}</p></div>
          <div className="bg-card rounded-lg border p-4"><p className="text-sm text-muted-foreground">Fee Agreements</p><p className="text-2xl font-bold">{stats.withFeeAgreement}</p></div>
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

              return (
                <div key={buyer.id} className="p-4">
                  <Collapsible open={isExpanded} onOpenChange={() => { const e = new Set(expanded); isExpanded ? e.delete(buyer.id) : e.add(buyer.id); setExpanded(e); }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link to={`/buyers/${buyer.id}`} className="font-semibold hover:text-primary transition-colors">
                            {buyer.platform_company_name || buyer.pe_firm_name}
                          </Link>
                          {hasFeeAgreement(buyer) && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                              <FileCheck className="w-3 h-3 mr-1" />Fee Agreement
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">{buyerContacts.length} contacts</Badge>
                        </div>
                        {buyer.platform_company_name && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Building2 className="w-3 h-3" /><span>{buyer.pe_firm_name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Select value={outreach?.deal_stage || "Not Started"} onValueChange={(v) => updateStage(buyer.id, v)}>
                          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>{stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">{isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    <CollapsibleContent className="mt-4 space-y-3">
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