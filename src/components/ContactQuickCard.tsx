import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, Linkedin, Phone, User } from "lucide-react";
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
}

interface ContactQuickCardProps {
  contact: Contact;
  onEmailClick?: (contact: Contact) => void;
  compact?: boolean;
}

export function ContactQuickCard({ contact, onEmailClick, compact = false }: ContactQuickCardProps) {
  const getPriorityColor = (priority: number | null) => {
    if (!priority) return "bg-muted";
    if (priority <= 2) return "bg-green-500/20 border-green-500/30";
    if (priority === 3) return "bg-amber-500/10 border-amber-500/20";
    return "bg-muted/50";
  };

  const getPriorityDot = (priority: number | null) => {
    if (!priority) return "bg-muted-foreground";
    if (priority <= 2) return "bg-green-500";
    if (priority === 3) return "bg-amber-500";
    return "bg-muted-foreground";
  };

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-sm",
        getPriorityColor(contact.priority_level)
      )}>
        <span className={cn("w-2 h-2 rounded-full shrink-0", getPriorityDot(contact.priority_level))} />
        <span className="font-medium truncate">{contact.name}</span>
        {contact.title && <span className="text-muted-foreground truncate text-xs">• {contact.title}</span>}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {contact.email && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a 
                  href={`mailto:${contact.email}`} 
                  className="flex items-center gap-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded px-1.5 py-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs">Email</span>
                </a>
              </TooltipTrigger>
              <TooltipContent>Send email to {contact.name}</TooltipContent>
            </Tooltip>
          )}
          {contact.linkedin_url && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a 
                  href={contact.linkedin_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-muted-foreground hover:text-[#0077b5] hover:bg-[#0077b5]/10 rounded px-1.5 py-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs">LinkedIn</span>
                </a>
              </TooltipTrigger>
              <TooltipContent>View {contact.name}'s LinkedIn</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      getPriorityColor(contact.priority_level)
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className={cn("w-2.5 h-2.5 rounded-full mt-1.5 shrink-0", getPriorityDot(contact.priority_level))} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{contact.name}</span>
              {contact.is_primary_contact && (
                <Badge variant="default" className="text-[10px] h-4">Primary</Badge>
              )}
              {contact.role_category && contact.role_category !== 'other' && (
                <Badge variant="outline" className="text-[10px] h-4 capitalize">
                  {contact.role_category.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
            {contact.title && (
              <p className="text-sm text-muted-foreground">{contact.title}</p>
            )}
            {/* Display email and LinkedIn as clickable text */}
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {contact.email && (
                <a 
                  href={`mailto:${contact.email}`} 
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="w-3 h-3" />
                  {contact.email}
                </a>
              )}
              {contact.linkedin_url && (
                <a 
                  href={contact.linkedin_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-[#0077b5] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Linkedin className="w-3 h-3" />
                  LinkedIn
                </a>
              )}
              {contact.phone && (
                <a 
                  href={`tel:${contact.phone}`} 
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="w-3 h-3" />
                  {contact.phone}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {contact.email && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEmailClick) {
                      onEmailClick(contact);
                    } else {
                      window.location.href = `mailto:${contact.email}`;
                    }
                  }}
                >
                  <Mail className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">Email</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send email to {contact.name}</TooltipContent>
            </Tooltip>
          )}
          {contact.phone && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  asChild
                >
                  <a href={`tel:${contact.phone}`} onClick={(e) => e.stopPropagation()}>
                    <Phone className="w-4 h-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Call {contact.name}</TooltipContent>
            </Tooltip>
          )}
          {contact.linkedin_url && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1 text-[#0077b5] hover:text-[#0077b5] hover:bg-[#0077b5]/10"
                  asChild
                >
                  <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    <Linkedin className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">LinkedIn</span>
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>View {contact.name}'s LinkedIn profile</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}