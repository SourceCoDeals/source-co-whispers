import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, Linkedin, ExternalLink, Star, Plus, Briefcase } from "lucide-react";
import { AddContactDialog } from "./AddContactDialog";

interface Contact {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  is_primary_contact: boolean | null;
  company_type: string | null;
}

interface MainContactSectionProps {
  buyerId: string;
  contacts: Contact[];
  onContactUpdate: () => void;
  peFirmName?: string;
  platformCompanyName?: string;
  deal?: any;
  hasFeeAgreement?: boolean;
}

// Helper function to generate deal summary email
function generateDealSummaryMailto(
  contact: { name: string; email: string | null },
  deal: any | null,
  hasFeeAgreement: boolean
): string {
  if (!contact.email) return '';
  if (!deal) return `mailto:${contact.email}`;
  
  const firstName = contact.name?.split(' ')[0] || '';
  
  // Format geography - if no fee agreement, only show state (last part of geography)
  const formatGeography = () => {
    if (!deal.geography || deal.geography.length === 0) return 'Geography available upon request';
    
    if (hasFeeAgreement) {
      return deal.geography.join(', ');
    } else {
      // Extract just the state from geography entries
      const states = deal.geography.map((g: string) => {
        const parts = g.split(',').map((p: string) => p.trim());
        return parts[parts.length - 1];
      });
      return [...new Set(states)].join(', ');
    }
  };
  
  const formatRevenue = () => {
    if (!deal.revenue) return 'Revenue details available';
    return `$${deal.revenue}M`;
  };
  
  const formatEbitda = () => {
    if (deal.ebitda_amount) return `$${deal.ebitda_amount}M`;
    if (deal.ebitda_percentage && deal.revenue) {
      return `~$${(deal.revenue * deal.ebitda_percentage / 100).toFixed(1)}M`;
    }
    return 'EBITDA details available';
  };
  
  const formatLocations = () => {
    const count = deal.location_count || 1;
    return `${count} location${count !== 1 ? 's' : ''}`;
  };
  
  const formatExpansionNote = () => {
    if (deal.growth_trajectory) return deal.growth_trajectory;
    return 'growth opportunity available';
  };
  
  const formatCertifications = () => {
    const parts: string[] = [];
    if (deal.service_mix) parts.push(deal.service_mix);
    return parts.length > 0 ? parts.join('; ') : 'certification details available';
  };
  
  const subject = 'Off market collision deal';
  
  const body = `Hi ${firstName},

I wanted to quickly share an off-market collision repair opportunity to see if it could be a fit.

At a glance:

• ${formatGeography()}

• ${formatRevenue()} revenue / ${formatEbitda()} EBITDA

• ${formatLocations()}, ${formatExpansionNote()}

• Multiple DRPs; ${formatCertifications()}

The owner is fully committed to a sale, has shared all diligence materials, and is ready to move forward. If this is directionally interesting, happy to share more detail or make an introduction.

Best,
Tomos Mughan`;

  return `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function MainContactSection({ buyerId, contacts, onContactUpdate, peFirmName, platformCompanyName, deal, hasFeeAgreement = false }: MainContactSectionProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const primaryContact = contacts.find(c => c.is_primary_contact);
  
  const handleSelectContact = async (contactId: string) => {
    if (contactId === primaryContact?.id) return;
    
    setIsUpdating(true);
    try {
      // First, unset any existing primary contact for this buyer
      await supabase
        .from("buyer_contacts")
        .update({ is_primary_contact: false })
        .eq("buyer_id", buyerId);
      
      // Then set the new primary contact
      const { error } = await supabase
        .from("buyer_contacts")
        .update({ is_primary_contact: true })
        .eq("id", contactId);
      
      if (error) throw error;
      
      toast({ title: "Primary contact updated" });
      onContactUpdate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  if (contacts.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Main Point of Contact</h3>
          </div>
          <AddContactDialog 
            buyerId={buyerId} 
            onContactAdded={onContactUpdate}
            existingContactsCount={0}
            peFirmName={peFirmName}
            platformCompanyName={platformCompanyName}
            trigger={
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            }
          />
        </div>
        <div className="text-center py-6 text-muted-foreground">
          <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No contacts available.</p>
          <p className="text-xs mt-1">Click "Add Contact" to create your first contact.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Main Point of Contact</h3>
        </div>
        <AddContactDialog 
          buyerId={buyerId} 
          onContactAdded={onContactUpdate}
          existingContactsCount={contacts.length}
          peFirmName={peFirmName}
          platformCompanyName={platformCompanyName}
          trigger={
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          }
        />
      </div>
      
      <div className="space-y-4">
        {/* Contact Selector */}
        <Select 
          value={primaryContact?.id || ""} 
          onValueChange={handleSelectContact}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a primary contact..." />
          </SelectTrigger>
          <SelectContent>
            {contacts.map(contact => (
              <SelectItem key={contact.id} value={contact.id}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{contact.name}</span>
                  {contact.title && (
                    <span className="text-muted-foreground text-sm">• {contact.title}</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Selected Contact Display */}
        {primaryContact && (
          <div className="bg-muted/30 rounded-lg p-4 border border-muted">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-semibold text-primary">
                  {primaryContact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-lg">{primaryContact.name}</h4>
                  {primaryContact.company_type && (
                    <Badge variant="outline" className="text-xs">
                      {primaryContact.company_type}
                    </Badge>
                  )}
                </div>
                
                
                <div className="mt-3 space-y-2">
                  {primaryContact.title && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>{primaryContact.title}</span>
                    </div>
                  )}
                  {primaryContact.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a 
                        href={generateDealSummaryMailto(primaryContact, deal, hasFeeAgreement)} 
                        className="text-primary hover:underline truncate"
                      >
                        {primaryContact.email}
                      </a>
                    </div>
                  )}
                  
                  {primaryContact.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a 
                        href={`tel:${primaryContact.phone}`} 
                        className="text-primary hover:underline"
                      >
                        {primaryContact.phone}
                      </a>
                    </div>
                  )}
                  
                  {primaryContact.linkedin_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <Linkedin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a 
                        href={primaryContact.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        LinkedIn Profile
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
                
                {/* Quick Action Buttons */}
                <div className="flex gap-2 mt-4">
                  {primaryContact.email && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={generateDealSummaryMailto(primaryContact, deal, hasFeeAgreement)}>
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </a>
                    </Button>
                  )}
                  {primaryContact.phone && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${primaryContact.phone}`}>
                        <Phone className="w-4 h-4 mr-2" />
                        Call
                      </a>
                    </Button>
                  )}
                  {primaryContact.linkedin_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={primaryContact.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="w-4 h-4 mr-2" />
                        LinkedIn
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
