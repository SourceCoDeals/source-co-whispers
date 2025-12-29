import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { User, ChevronDown, ChevronRight, Mail, Linkedin, Phone, Loader2, UserSearch, Plus, Building2, ExternalLink } from "lucide-react";
import { ContactQuickCard } from "@/components/ContactQuickCard";
import { AddContactDialog } from "@/components/AddContactDialog";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

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
  company_type?: string;
}

interface ContactsSummarySectionProps {
  buyerId: string;
  peFirmName: string;
  platformCompanyName?: string | null;
  peFirmContacts: Contact[];
  platformContacts: Contact[];
  onFindContacts: (companyType: "PE Firm" | "Platform") => void;
  onContactAdded: () => void;
  isFinding: boolean;
  findingType?: "PE Firm" | "Platform";
  peFirmDetailLink?: string;
  platformDetailLink?: string;
}

export function ContactsSummarySection({
  buyerId,
  peFirmName,
  platformCompanyName,
  peFirmContacts,
  platformContacts,
  onFindContacts,
  onContactAdded,
  isFinding,
  findingType,
  peFirmDetailLink,
  platformDetailLink,
}: ContactsSummarySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const allContacts = [...peFirmContacts, ...platformContacts];
  const totalCount = allContacts.length;
  const highPriorityCount = allContacts.filter(c => c.priority_level && c.priority_level <= 2).length;
  
  // Sort contacts by priority
  const sortedPeFirmContacts = [...peFirmContacts].sort((a, b) => (a.priority_level || 99) - (b.priority_level || 99));
  const sortedPlatformContacts = [...platformContacts].sort((a, b) => (a.priority_level || 99) - (b.priority_level || 99));
  
  // Get display contacts (max 3 per company)
  const displayPeFirmContacts = sortedPeFirmContacts.slice(0, 3);
  const displayPlatformContacts = sortedPlatformContacts.slice(0, 3);
  
  const hasMorePeFirm = peFirmContacts.length > 3;
  const hasMorePlatform = platformContacts.length > 3;

  if (totalCount === 0 && !isFinding) {
    return (
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <span className="text-sm text-muted-foreground flex items-center gap-2">
          <User className="w-4 h-4" />
          No contacts found
        </span>
        <div className="flex items-center gap-2">
          <AddContactDialog
            buyerId={buyerId}
            onContactAdded={onContactAdded}
            existingContactsCount={0}
            peFirmName={peFirmName}
            platformCompanyName={platformCompanyName || undefined}
            trigger={
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            }
          />
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => onFindContacts("PE Firm")}
            disabled={isFinding}
          >
            {isFinding ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <UserSearch className="w-3 h-3 mr-1" />
            )}
            Find Contacts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="border rounded-lg bg-muted/20 overflow-hidden">
        {/* Summary Header - Always Visible */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {totalCount} contact{totalCount !== 1 ? "s" : ""}
              </span>
              {highPriorityCount > 0 && (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                  {highPriorityCount} high priority
                </Badge>
              )}
              {isFinding && (
                <Badge variant="secondary" className="text-xs">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Searching...
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isExpanded ? "Hide" : "Show"}
              </span>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t p-3 space-y-4">
            {/* PE Firm Contacts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">{peFirmName}</span>
                  <Badge variant="secondary" className="text-[10px] h-4">
                    {peFirmContacts.length} contact{peFirmContacts.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <AddContactDialog
                    buyerId={buyerId}
                    onContactAdded={onContactAdded}
                    existingContactsCount={peFirmContacts.length}
                    peFirmName={peFirmName}
                    trigger={
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={(e) => e.stopPropagation()}>
                            <Plus className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">Add</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add contact to {peFirmName}</TooltipContent>
                      </Tooltip>
                    }
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs px-2"
                        onClick={(e) => { e.stopPropagation(); onFindContacts("PE Firm"); }}
                        disabled={isFinding && findingType === "PE Firm"}
                      >
                        {isFinding && findingType === "PE Firm" ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <UserSearch className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">Find</span>
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Search for contacts at {peFirmName}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              {displayPeFirmContacts.length > 0 ? (
                <div className="space-y-1.5">
                  {displayPeFirmContacts.map(contact => (
                    <ContactQuickCard key={contact.id} contact={contact} compact />
                  ))}
                  {hasMorePeFirm && peFirmDetailLink && (
                    <Link 
                      to={peFirmDetailLink}
                      className="text-xs text-primary hover:underline flex items-center gap-1 pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View all {peFirmContacts.length} contacts
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No PE firm contacts yet</p>
              )}
            </div>

            {/* Platform Contacts */}
            {platformCompanyName && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">{platformCompanyName}</span>
                    <Badge variant="secondary" className="text-[10px] h-4">
                      {platformContacts.length} contact{platformContacts.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <AddContactDialog
                      buyerId={buyerId}
                      onContactAdded={onContactAdded}
                      existingContactsCount={platformContacts.length}
                      peFirmName={peFirmName}
                      platformCompanyName={platformCompanyName}
                      trigger={
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={(e) => e.stopPropagation()}>
                              <Plus className="w-3 h-3 mr-1" />
                              <span className="hidden sm:inline">Add</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Add contact to {platformCompanyName}</TooltipContent>
                        </Tooltip>
                      }
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs px-2"
                          onClick={(e) => { e.stopPropagation(); onFindContacts("Platform"); }}
                          disabled={isFinding && findingType === "Platform"}
                        >
                          {isFinding && findingType === "Platform" ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <UserSearch className="w-3 h-3 mr-1" />
                              <span className="hidden sm:inline">Find</span>
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Search for contacts at {platformCompanyName}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                
                {displayPlatformContacts.length > 0 ? (
                  <div className="space-y-1.5">
                    {displayPlatformContacts.map(contact => (
                      <ContactQuickCard key={contact.id} contact={contact} compact />
                    ))}
                    {hasMorePlatform && platformDetailLink && (
                      <Link 
                        to={platformDetailLink}
                        className="text-xs text-primary hover:underline flex items-center gap-1 pt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View all {platformContacts.length} contacts
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No platform contacts yet</p>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
