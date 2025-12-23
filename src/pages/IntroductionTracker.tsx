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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, ChevronDown, ChevronRight, Mail, Linkedin, Building2, FileCheck, UserPlus, ExternalLink, AlertTriangle, Target, User, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const employeeOptions = ["Unassigned", "John Smith", "Sarah Johnson", "Mike Williams", "Emily Davis", "Chris Brown"];

export default function IntroductionTracker() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deal, setDeal] = useState<any>(null);
  const [approvedBuyers, setApprovedBuyers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<Record<string, any[]>>({});
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
      }
    }
    setIsLoading(false);
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

  const formatDateApproved = (scoreData: any) => {
    if (!scoreData?.scored_at) return "—";
    return new Date(scoreData.scored_at).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStatus = (scoreData: any) => {
    if (scoreData?.interested) return "interested";
    if (scoreData?.passed_on_deal) return "passed";
    return null;
  };

  const stats = {
    approved: approvedBuyers.length,
    interested: approvedBuyers.filter(b => b.score?.interested).length,
    passed: approvedBuyers.filter(b => b.score?.passed_on_deal).length,
  };

  if (isLoading) return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">Buyer History</h1>
            <p className="text-muted-foreground">{deal?.deal_name} · {approvedBuyers.length} approved buyers</p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/deals/${id}/matching`)}>Manage Approved Buyers</Button>
        </div>

        {/* Stats Grid - Simplified */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold">{stats.approved}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Interested</p>
            <p className="text-2xl font-bold text-blue-600">{stats.interested}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Passed</p>
            <p className="text-2xl font-bold text-red-600">{stats.passed}</p>
          </div>
        </div>

        {/* Approved Buyers Table */}
        {approvedBuyers.length === 0 ? (
          <div className="bg-card rounded-lg border p-8 text-center">
            <p className="text-muted-foreground mb-4">No approved buyers yet.</p>
            <Button onClick={() => navigate(`/deals/${id}/matching`)}>Approve Buyers</Button>
          </div>
        ) : (
          <div className="bg-card rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Approved Buyers</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Buyer Name</TableHead>
                  <TableHead>PE Firm</TableHead>
                  <TableHead>Date Approved</TableHead>
                  <TableHead>Fit Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedBuyers.map((buyer) => {
                  const buyerContacts = contacts[buyer.id] || [];
                  const isExpanded = expanded.has(buyer.id);
                  const status = getStatus(buyer.score);

                  return (
                    <Collapsible key={buyer.id} open={isExpanded} onOpenChange={() => { const e = new Set(expanded); isExpanded ? e.delete(buyer.id) : e.add(buyer.id); setExpanded(e); }} asChild>
                      <>
                        <TableRow className="group hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Link to={`/buyers/${buyer.id}`} className="font-medium hover:text-primary transition-colors">
                                {buyer.platform_company_name || buyer.pe_firm_name}
                              </Link>
                              {buyer.platform_website && (
                                <a href={buyer.platform_website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {hasFeeAgreement(buyer) && (
                                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                                  <FileCheck className="w-3 h-3 mr-1" />Fee
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Building2 className="w-3.5 h-3.5" />
                              <span>{buyer.pe_firm_name}</span>
                              {buyer.pe_firm_website && (
                                <a href={buyer.pe_firm_website} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDateApproved(buyer.score)}
                          </TableCell>
                          <TableCell>
                            {buyer.score?.composite_score != null ? (
                              <Badge 
                                variant={
                                  buyer.score.composite_score >= 70 ? "match-high" : 
                                  buyer.score.composite_score >= 40 ? "match-medium" : "match-low"
                                }
                              >
                                {Math.round(buyer.score.composite_score)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {status === "interested" && (
                              <Badge variant="info" className="gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Interested
                              </Badge>
                            )}
                            {status === "passed" && (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="w-3 h-3" />
                                Passed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <tr>
                            <td colSpan={6} className="p-0">
                              <div className="p-4 bg-muted/30 border-t space-y-4">
                                {/* Quick Intel Section */}
                                <div className="bg-background rounded-lg p-4 space-y-3">
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
                                    {buyer.employee_owner && (
                                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                                        <User className="w-3 h-3 mr-1" />{buyer.employee_owner}
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                {/* Contacts Section */}
                                <div className="bg-background rounded-lg p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium">Contacts ({buyerContacts.length})</h4>
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
                              </div>
                            </td>
                          </tr>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
