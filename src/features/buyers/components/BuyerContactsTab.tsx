import { Badge } from "@/components/ui/badge";
import { BuyerDataSection } from "@/components/BuyerDataSection";
import { ContactCSVImport } from "@/components/ContactCSVImport";
import { AddContactDialog } from "@/components/AddContactDialog";
import { EditContactDialog } from "@/components/EditContactDialog";
import { User, Star } from "lucide-react";

interface BuyerContactsTabProps {
  buyerId: string;
  buyer: any;
  contacts: any[];
  deal?: any;
  onRefresh: () => void;
}

// Helper function to generate deal summary email
function generateDealSummaryMailto(
  contact: { name: string; email: string },
  deal: any | null,
  hasFeeAgreement: boolean
): string {
  if (!deal || !contact.email) return `mailto:${contact.email}`;
  
  const firstName = contact.name?.split(' ')[0] || '';
  
  const formatGeography = () => {
    if (!deal.geography || deal.geography.length === 0) return 'Geography available upon request';
    if (hasFeeAgreement) return deal.geography.join(', ');
    const states = deal.geography.map((g: string) => {
      const parts = g.split(',').map((p: string) => p.trim());
      return parts[parts.length - 1];
    });
    return [...new Set(states)].join(', ');
  };
  
  const formatRevenue = () => deal.revenue ? `$${deal.revenue}M` : 'Revenue details available';
  const formatEbitda = () => {
    if (deal.ebitda_amount) return `$${deal.ebitda_amount}M`;
    if (deal.ebitda_percentage && deal.revenue) return `~$${(deal.revenue * deal.ebitda_percentage / 100).toFixed(1)}M`;
    return 'EBITDA details available';
  };
  const formatLocations = () => `${deal.location_count || 1} location${(deal.location_count || 1) !== 1 ? 's' : ''}`;
  
  const subject = 'Off market collision deal';
  const body = `Hi ${firstName},

I wanted to quickly share an off-market collision repair opportunity to see if it could be a fit.

At a glance:

• ${formatGeography()}
• ${formatRevenue()} revenue / ${formatEbitda()} EBITDA
• ${formatLocations()}, ${deal.growth_trajectory || 'growth opportunity available'}
• Multiple DRPs; ${deal.service_mix || 'certification details available'}

The owner is fully committed to a sale, has shared all diligence materials, and is ready to move forward. If this is directionally interesting, happy to share more detail or make an introduction.

Best,
Tomos Mughan`;

  return `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function BuyerContactsTab({ buyerId, buyer, contacts, deal, onRefresh }: BuyerContactsTabProps) {
  return (
    <div className="space-y-4">
      {/* Import Button Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Contacts</h3>
        <div className="flex items-center gap-2">
          <AddContactDialog 
            buyerId={buyerId} 
            onContactAdded={onRefresh}
            existingContactsCount={contacts.length}
            peFirmName={buyer.pe_firm_name}
            platformCompanyName={buyer.platform_company_name || undefined}
          />
          <ContactCSVImport buyerId={buyerId} onComplete={onRefresh} />
        </div>
      </div>
      
      <BuyerDataSection title="" icon={<User className="w-4 h-4 text-muted-foreground" />} isEmpty={contacts.length === 0} emptyMessage="No contacts added yet. Import contacts from a CSV file.">
        <div className="divide-y">
          {contacts.map((c) => (
            <div key={c.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{c.name}</p>
                      {c.is_primary_contact && (
                        <Badge variant="default" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{c.title}</p>
                    {c.company_type && (
                      <p className="text-xs text-muted-foreground mt-0.5">{c.company_type}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.priority_level && <Badge variant="outline">Priority {c.priority_level}</Badge>}
                  <EditContactDialog
                    contact={c}
                    buyerId={buyerId}
                    onContactUpdated={onRefresh}
                    peFirmName={buyer?.pe_firm_name}
                    platformCompanyName={buyer?.platform_company_name}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm">
                {c.email && (
                  <a 
                    href={generateDealSummaryMailto(c, deal, buyer?.has_fee_agreement || false)} 
                    className="text-primary hover:underline"
                  >
                    {c.email}
                  </a>
                )}
                {c.phone && <span className="text-muted-foreground">{c.phone}</span>}
                {c.linkedin_url && (
                  <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </BuyerDataSection>
    </div>
  );
}
