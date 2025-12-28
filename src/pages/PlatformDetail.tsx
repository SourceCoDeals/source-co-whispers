import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BuyerDataSection, DataField, DataListField, DataGrid } from "@/components/BuyerDataSection";
import { ContactsTable } from "@/components/ContactsTable";
import { Loader2, ArrowLeft, Edit, ExternalLink, Building2, MapPin, BarChart3, Target, Globe, Linkedin, Sparkles, DollarSign, TrendingUp, FileCheck, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Platform {
  id: string;
  pe_firm_id: string;
  domain: string;
  name: string;
  website: string | null;
  linkedin: string | null;
  industry_vertical: string | null;
  business_summary: string | null;
  services_offered: string | null;
  business_model: string | null;
  specialized_focus: string | null;
  geographic_footprint: string[] | null;
  thesis_summary: string | null;
  thesis_confidence: string | null;
  min_revenue: number | null;
  max_revenue: number | null;
  revenue_sweet_spot: number | null;
  min_ebitda: number | null;
  max_ebitda: number | null;
  ebitda_sweet_spot: number | null;
  target_services: string[] | null;
  target_industries: string[] | null;
  deal_breakers: string[] | null;
  has_fee_agreement: boolean | null;
  data_last_updated: string;
}

interface PEFirm {
  id: string;
  name: string;
  website: string | null;
  linkedin: string | null;
  hq_city: string | null;
  hq_state: string | null;
  hq_country: string | null;
  has_fee_agreement: boolean | null;
}

interface Contact {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  role_category: string | null;
  priority_level: number | null;
  is_primary_contact: boolean | null;
  source: string | null;
  created_at: string;
}

export default function PlatformDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [peFirm, setPeFirm] = useState<PEFirm | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [peFirmContacts, setPeFirmContacts] = useState<Contact[]>([]);
  const [trackerNames, setTrackerNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<Platform>>({});
  const [isDiscovering, setIsDiscovering] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    // Load platform
    const { data: platformData, error: platformError } = await supabase
      .from("platforms")
      .select("*")
      .eq("id", id)
      .single();

    if (platformError || !platformData) {
      setIsLoading(false);
      return;
    }

    setPlatform(platformData);
    setEditData(platformData);

    // Load PE firm
    const { data: peFirmData } = await supabase
      .from("pe_firms")
      .select("*")
      .eq("id", platformData.pe_firm_id)
      .single();

    setPeFirm(peFirmData);

    // Load platform contacts
    const { data: platformContactsData } = await supabase
      .from("platform_contacts")
      .select("*")
      .eq("platform_id", id)
      .order("priority_level", { ascending: true });

    setContacts(platformContactsData || []);

    // Load PE firm contacts if we have a PE firm
    if (peFirmData) {
      const { data: peFirmContactsData } = await supabase
        .from("pe_firm_contacts")
        .select("*")
        .eq("pe_firm_id", peFirmData.id)
        .order("priority_level", { ascending: true });

      setPeFirmContacts(peFirmContactsData || []);
    }

    // Load tracker names via tracker_buyers junction
    const { data: trackerBuyers } = await supabase
      .from("tracker_buyers")
      .select("tracker_id")
      .eq("platform_id", id);

    if (trackerBuyers && trackerBuyers.length > 0) {
      const trackerIds = trackerBuyers.map(tb => tb.tracker_id);
      const { data: trackers } = await supabase
        .from("industry_trackers")
        .select("industry_name")
        .in("id", trackerIds);

      setTrackerNames(trackers?.map(t => t.industry_name) || []);
    }

    setIsLoading(false);
  };

  const handleDiscoverContacts = async () => {
    if (!platform?.website) {
      toast({ title: "No website", description: "Platform needs a website to discover contacts", variant: "destructive" });
      return;
    }
    
    setIsDiscovering(true);
    toast({ title: "Finding contacts...", description: `Scanning ${platform.name} website` });

    const { data, error } = await supabase.functions.invoke('find-buyer-contacts', {
      body: { 
        platformId: id,
        platformWebsite: platform.website,
        platformName: platform.name
      }
    });

    setIsDiscovering(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data?.success) {
      toast({ 
        title: `Found ${data.contacts_found} contacts`, 
        description: `Added ${data.contacts_inserted} new contacts`
      });
      loadData();
    }
  };

  const saveChanges = async () => {
    const { error } = await supabase
      .from("platforms")
      .update({
        name: editData.name,
        website: editData.website,
        linkedin: editData.linkedin,
        industry_vertical: editData.industry_vertical,
        business_summary: editData.business_summary,
        services_offered: editData.services_offered,
        thesis_summary: editData.thesis_summary,
        min_revenue: editData.min_revenue,
        max_revenue: editData.max_revenue,
        min_ebitda: editData.min_ebitda,
        max_ebitda: editData.max_ebitda,
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Platform updated" });
    setEditDialogOpen(false);
    loadData();
  };

  const formatRevenue = (min: number | null, max: number | null, sweetSpot: number | null) => {
    const format = (n: number) => {
      if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
      if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
      return `$${n}`;
    };

    if (sweetSpot) return `Target: ${format(sweetSpot)}`;
    if (min && max) return `${format(min)} - ${format(max)}`;
    if (min) return `${format(min)}+`;
    if (max) return `Up to ${format(max)}`;
    return null;
  };

  const togglePeFirmFeeAgreement = async (checked: boolean) => {
    if (!peFirm) return;
    const { error } = await supabase
      .from("pe_firms")
      .update({ has_fee_agreement: checked })
      .eq("id", peFirm.id);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setPeFirm({ ...peFirm, has_fee_agreement: checked });
    toast({ title: checked ? "Fee agreement added" : "Fee agreement removed" });
  };

  const togglePlatformFeeAgreement = async (checked: boolean) => {
    if (!platform) return;
    const { error } = await supabase
      .from("platforms")
      .update({ has_fee_agreement: checked })
      .eq("id", platform.id);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setPlatform({ ...platform, has_fee_agreement: checked });
    toast({ title: checked ? "Fee agreement added" : "Fee agreement removed" });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!platform) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Platform not found</h2>
          <Button onClick={() => navigate("/buyers")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Buyers
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" onClick={() => navigate("/buyers")} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              All Buyers
            </Button>
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-display font-bold">{platform.name}</h1>
                {peFirm && (
                  <p className="text-muted-foreground">
                    Backed by {peFirm.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {trackerNames.map((name, i) => (
                <Badge key={i} variant="secondary">{name}</Badge>
              ))}
              {platform.thesis_confidence && (
                <Badge variant={platform.thesis_confidence === "high" ? "default" : "outline"}>
                  {platform.thesis_confidence} confidence
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {platform.website && (
              <Button variant="outline" size="sm" asChild>
                <a href={platform.website} target="_blank" rel="noopener noreferrer">
                  <Globe className="w-4 h-4 mr-2" />
                  Website
                </a>
              </Button>
            )}
            {platform.linkedin && (
              <Button variant="outline" size="sm" asChild>
                <a href={platform.linkedin} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </a>
              </Button>
            )}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Platform</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Platform Name</Label>
                      <Input 
                        value={editData.name || ""} 
                        onChange={(e) => setEditData({...editData, name: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input 
                        value={editData.industry_vertical || ""} 
                        onChange={(e) => setEditData({...editData, industry_vertical: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input 
                        value={editData.website || ""} 
                        onChange={(e) => setEditData({...editData, website: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>LinkedIn</Label>
                      <Input 
                        value={editData.linkedin || ""} 
                        onChange={(e) => setEditData({...editData, linkedin: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Business Summary</Label>
                    <Textarea 
                      value={editData.business_summary || ""} 
                      onChange={(e) => setEditData({...editData, business_summary: e.target.value})} 
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Thesis Summary</Label>
                    <Textarea 
                      value={editData.thesis_summary || ""} 
                      onChange={(e) => setEditData({...editData, thesis_summary: e.target.value})} 
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Revenue</Label>
                      <Input 
                        type="number"
                        value={editData.min_revenue || ""} 
                        onChange={(e) => setEditData({...editData, min_revenue: e.target.value ? Number(e.target.value) : null})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Revenue</Label>
                      <Input 
                        type="number"
                        value={editData.max_revenue || ""} 
                        onChange={(e) => setEditData({...editData, max_revenue: e.target.value ? Number(e.target.value) : null})} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min EBITDA</Label>
                      <Input 
                        type="number"
                        value={editData.min_ebitda || ""} 
                        onChange={(e) => setEditData({...editData, min_ebitda: e.target.value ? Number(e.target.value) : null})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max EBITDA</Label>
                      <Input 
                        type="number"
                        value={editData.max_ebitda || ""} 
                        onChange={(e) => setEditData({...editData, max_ebitda: e.target.value ? Number(e.target.value) : null})} 
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={saveChanges}>Save Changes</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Fee Agreements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              Fee Agreements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{peFirm?.name || "PE Firm"}</p>
                <p className="text-xs text-muted-foreground">PE Firm level agreement</p>
              </div>
              <Switch 
                checked={peFirm?.has_fee_agreement || false} 
                onCheckedChange={togglePeFirmFeeAgreement}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{platform.name}</p>
                <p className="text-xs text-muted-foreground">Platform level agreement</p>
              </div>
              <Switch 
                checked={platform.has_fee_agreement || false} 
                onCheckedChange={togglePlatformFeeAgreement}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Revenue Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {formatRevenue(platform.min_revenue, platform.max_revenue, platform.revenue_sweet_spot) || "Not specified"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                EBITDA Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {formatRevenue(platform.min_ebitda, platform.max_ebitda, platform.ebitda_sweet_spot) || "Not specified"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Geography
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {platform.geographic_footprint?.slice(0, 2).join(", ") || "Not specified"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4" />
                Industry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {platform.industry_vertical || "Not specified"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="contacts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="contacts">
              <Users className="w-4 h-4 mr-2" />
              Contacts ({contacts.length})
            </TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="criteria">Investment Criteria</TabsTrigger>
            <TabsTrigger value="pe-firm">PE Firm</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Platform Contacts</h3>
              <ContactsTable
                contacts={contacts}
                entityType="platform"
                entityId={platform.id}
                entityName={platform.name}
                onContactsChange={loadData}
                showDiscoverButton={!!platform.website}
                onDiscover={handleDiscoverContacts}
                isDiscovering={isDiscovering}
              />
            </div>
            
            {peFirmContacts.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    PE Firm Contacts ({peFirm?.name})
                  </h3>
                  {peFirm && (
                    <Link to={`/pe-firms/${peFirm.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs">
                        View All PE Firm Contacts →
                      </Button>
                    </Link>
                  )}
                </div>
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
                  <p className="mb-3">These contacts are from the parent PE firm and may be relevant for outreach.</p>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {peFirmContacts.slice(0, 6).map((contact) => (
                      <div key={contact.id} className="flex items-center gap-2 bg-background rounded p-2 text-sm">
                        <span className={`w-2 h-2 rounded-full ${contact.priority_level && contact.priority_level <= 2 ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                        <span className="font-medium truncate">{contact.name}</span>
                        {contact.title && <span className="text-muted-foreground text-xs truncate">• {contact.title}</span>}
                      </div>
                    ))}
                  </div>
                  {peFirmContacts.length > 6 && (
                    <p className="text-xs text-muted-foreground mt-2">+{peFirmContacts.length - 6} more contacts</p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <BuyerDataSection title="Business Overview" icon={<Building2 className="w-4 h-4" />}>
              <DataGrid>
                <DataField label="Business Summary" value={platform.business_summary} />
                <DataField label="Services Offered" value={platform.services_offered} />
                <DataField label="Business Model" value={platform.business_model} />
                <DataField label="Specialized Focus" value={platform.specialized_focus} />
              </DataGrid>
            </BuyerDataSection>

            {platform.thesis_summary && (
              <BuyerDataSection title="Investment Thesis" icon={<Sparkles className="w-4 h-4" />}>
                <p className="text-sm">{platform.thesis_summary}</p>
              </BuyerDataSection>
            )}
          </TabsContent>

          <TabsContent value="criteria" className="space-y-4">
            <BuyerDataSection title="Size Criteria" icon={<BarChart3 className="w-4 h-4" />}>
              <DataGrid>
                <DataField 
                  label="Revenue Range" 
                  value={formatRevenue(platform.min_revenue, platform.max_revenue, platform.revenue_sweet_spot)} 
                />
                <DataField 
                  label="EBITDA Range" 
                  value={formatRevenue(platform.min_ebitda, platform.max_ebitda, platform.ebitda_sweet_spot)} 
                />
              </DataGrid>
            </BuyerDataSection>

            <BuyerDataSection title="Target Focus" icon={<Target className="w-4 h-4" />}>
              <DataGrid>
                <DataListField label="Target Services" items={platform.target_services} />
                <DataListField label="Target Industries" items={platform.target_industries} />
                <DataListField label="Geographic Footprint" items={platform.geographic_footprint} />
              </DataGrid>
            </BuyerDataSection>

            {platform.deal_breakers && platform.deal_breakers.length > 0 && (
              <BuyerDataSection title="Deal Breakers" icon={<Target className="w-4 h-4" />}>
                <DataListField label="Deal Breakers" items={platform.deal_breakers} />
              </BuyerDataSection>
            )}
          </TabsContent>

          <TabsContent value="pe-firm" className="space-y-4">
            {peFirm && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{peFirm.name}</h3>
                  <Link to={`/pe-firms/${peFirm.id}`}>
                    <Button variant="outline" size="sm">
                      View PE Firm Profile →
                    </Button>
                  </Link>
                </div>
                <BuyerDataSection title="PE Firm Details" icon={<Building2 className="w-4 h-4" />}>
                  <DataGrid>
                    <DataField label="Firm Name" value={peFirm.name} />
                    <DataField label="Location" value={[peFirm.hq_city, peFirm.hq_state, peFirm.hq_country].filter(Boolean).join(", ")} />
                    <DataField label="Website" value={peFirm.website} type="url" />
                  </DataGrid>
                </BuyerDataSection>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
