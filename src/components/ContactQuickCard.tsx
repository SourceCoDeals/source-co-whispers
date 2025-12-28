import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
            <a 
              href={`mailto:${contact.email}`} 
              className="text-muted-foreground hover:text-primary p-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          )}
          {contact.linkedin_url && (
            <a 
              href={contact.linkedin_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-[#0077b5] p-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Linkedin className="w-3.5 h-3.5" />
            </a>
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
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {contact.email && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
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
            </Button>
          )}
          {contact.phone && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              asChild
            >
              <a href={`tel:${contact.phone}`}>
                <Phone className="w-4 h-4" />
              </a>
            </Button>
          )}
          {contact.linkedin_url && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              asChild
            >
              <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer">
                <Linkedin className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
