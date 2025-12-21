import { User, Mail, Phone, Linkedin, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface ContactCardProps {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
}

export function ContactCard({ name, email, phone, linkedin }: ContactCardProps) {
  const hasAnyInfo = name || email || phone || linkedin;
  const initials = name 
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (!hasAnyInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">No contact information available</p>
        <p className="text-muted-foreground text-xs mt-1">Click edit to add contact details</p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4">
      <Avatar className="h-16 w-16 border-2 border-primary/10">
        <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-lg truncate">
          {name || <span className="text-muted-foreground italic">Name not specified</span>}
        </h3>
        
        <div className="mt-3 space-y-2">
          {email && (
            <a 
              href={`mailto:${email}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span className="truncate group-hover:underline">{email}</span>
            </a>
          )}
          
          {phone && (
            <a 
              href={`tel:${phone}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
            >
              <Phone className="w-4 h-4 shrink-0" />
              <span className="group-hover:underline">{phone}</span>
            </a>
          )}
          
          {linkedin && (
            <a 
              href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
            >
              <Linkedin className="w-4 h-4 shrink-0" />
              <span className="group-hover:underline">LinkedIn Profile</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {email && (
          <Button size="sm" variant="outline" asChild>
            <a href={`mailto:${email}`}>
              <Mail className="w-4 h-4 mr-2" />
              Email
            </a>
          </Button>
        )}
        {phone && (
          <Button size="sm" variant="outline" asChild>
            <a href={`tel:${phone}`}>
              <Phone className="w-4 h-4 mr-2" />
              Call
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
