import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ContactsTable } from "@/components/ContactsTable";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Building2, MapPin, Globe, Linkedin, Edit, FileCheck, Users, Briefcase, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PEFirm {
  id: string;
  name: string;
  domain: string;
  website: string | null;
  linkedin: string | null;
  hq_city: string | null;
  hq_state: string | null;
  hq_country: string | null;
  hq_region: string | null;
  has_fee_agreement: boolean | null;
  num_platforms: number | null;
  portfolio_companies: string[] | null;
}

interface Platform {
  id: string;
  name: string;
  domain: string;
  website: string | null;
  industry_vertical: string | null;
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

export default function PEFirmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [peFirm, setPeFirm] = useState<PEFirm | null>(null);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [trackerNames, setTrackerNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<PEFirm>>({});
  const [isDiscovering, setIsDiscovering] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    
    // Load PE firm
    const { data: firmData, error: firmError } = await supabase
      .from("pe_firms")
      .select("*")
      .eq("id", id)
      .single();

    if (firmError || !firmData) {
      setIsLoading(false);
      return;
    }

    setPeFirm(firmData);
    setEditData(firmData);

    // Load platforms
    const { data: platformsData } = await supabase
      .from("platforms")
      .select("id, name, domain, website, industry_vertical, has_fee_agreement")
      .eq("pe_firm_id", id)
      .order("name");

    setPlatforms(platformsData || []);

    // Load contacts
    const { data: contactsData } = await supabase
      .from("pe_firm_contacts")
      .select("*")
      .eq("pe_firm_id", id)
      .order("priority_level", { ascending: true });

    setContacts(contactsData || []);

    // Load tracker names via tracker_buyers junction
    const { data: trackerBuyers } = await supabase
      .from("tracker_buyers")
      .select("tracker_id")
      .eq("pe_firm_id", id);

    if (trackerBuyers && trackerBuyers.length > 0) {
      const trackerIds = [...new Set(trackerBuyers.map(tb => tb.tracker_id))];
      const { data: trackers } = await supabase
        .from("industry_trackers")
        .select("industry_name")
        .in("id", trackerIds);

      setTrackerNames(trackers?.map(t => t.industry_name) || []);
    }

    setIsLoading(false);
  };

  const toggleFeeAgreement = async (checked: boolean) => {
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

  const saveChanges = async () => {
    const { error } = await supabase
      .from("pe_firms")
      .update({
        name: editData.name,
        website: editData.website,
        linkedin: editData.linkedin,
        hq_city: editData.hq_city,
        hq_state: editData.hq_state,
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "PE Firm updated" });
    setEditDialogOpen(false);
    loadData();
  };

  const handleDiscoverContacts = async () => {
    if (!peFirm?.website) {
      toast({ title: "No website", description: "PE Firm needs a website to discover contacts", variant: "destructive" });
      return;
    }
    
    setIsDiscovering(true);
    toast({ title: "Finding contacts...", description: `Scanning ${peFirm.name} website` });

    const { data, error } = await supabase.functions.invoke('find-buyer-contacts', {
      body: { 
        peFirmId: id,
        peFirmWebsite: peFirm.website,
        peFirmName: peFirm.name
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

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!peFirm) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">PE Firm not found</h2>
          <Button onClick={() => navigate("/buyers")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Buyers
          </Button>
        </div>
      </AppLayout>
    );
  }

  const getLocation = () => {
    const parts = [peFirm.hq_city, peFirm.hq_state, peFirm.hq_country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

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
                <h1 className="text-2xl font-display font-bold">{peFirm.name}</h1>
                {getLocation() && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {getLocation()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {trackerNames.map((name, i) => (
                <Badge key={i} variant="secondary">{name}</Badge>
              ))}
              {peFirm.has_fee_agreement && (
                <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
                  <FileCheck className="w-3 h-3 mr-1" />
                  Fee Agreement
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {peFirm.website && (
              <Button variant="outline" size="sm" asChild>
                <a href={peFirm.website.startsWith('http') ? peFirm.website : `https://${peFirm.website}`} target="_blank" rel="noopener noreferrer">
                  <Globe className="w-4 h-4 mr-2" />
                  Website
                </a>
              </Button>
            )}
            {peFirm.linkedin && (
              <Button variant="outline" size="sm" asChild>
                <a href={peFirm.linkedin} target="_blank" rel="noopener noreferrer">
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit PE Firm</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Firm Name</Label>
                    <Input 
                      value={editData.name || ""} 
                      onChange={(e) => setEditData({...editData, name: e.target.value})} 
                    />
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input 
                        value={editData.hq_city || ""} 
                        onChange={(e) => setEditData({...editData, hq_city: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input 
                        value={editData.hq_state || ""} 
                        onChange={(e) => setEditData({...editData, hq_state: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                  <Button onClick={saveChanges}>Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{contacts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Platforms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{platforms.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Fee Agreement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Switch 
                checked={peFirm.has_fee_agreement || false} 
                onCheckedChange={toggleFeeAgreement}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Trackers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{trackerNames.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="contacts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
            <TabsTrigger value="platforms">Platforms ({platforms.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="space-y-4">
            <ContactsTable
              contacts={contacts}
              entityType="pe_firm"
              entityId={peFirm.id}
              entityName={peFirm.name}
              onContactsChange={loadData}
              showDiscoverButton={!!peFirm.website}
              onDiscover={handleDiscoverContacts}
              isDiscovering={isDiscovering}
            />
          </TabsContent>

          <TabsContent value="platforms" className="space-y-4">
            {platforms.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/30">
                <p>No platforms found for this PE firm.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {platforms.map((platform) => (
                  <Card key={platform.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <Link 
                          to={`/platforms/${platform.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {platform.name}
                        </Link>
                        <Link to={`/platforms/${platform.id}`}>
                          <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {platform.industry_vertical && (
                          <Badge variant="secondary" className="text-xs">{platform.industry_vertical}</Badge>
                        )}
                        {platform.website && (
                          <p className="text-xs text-muted-foreground truncate">{platform.website}</p>
                        )}
                        {platform.has_fee_agreement && (
                          <Badge variant="default" className="text-[10px] bg-green-500/20 text-green-600 border-green-500/30">
                            <FileCheck className="w-3 h-3 mr-1" />
                            Fee Agreement
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
