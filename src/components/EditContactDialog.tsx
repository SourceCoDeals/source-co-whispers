import { useState, useEffect } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  company_type?: string | null;
  is_primary_contact?: boolean | null;
}

interface EditContactDialogProps {
  contact: Contact;
  buyerId: string;
  onContactUpdated: () => void;
  peFirmName?: string;
  platformCompanyName?: string;
}

export function EditContactDialog({ 
  contact,
  buyerId, 
  onContactUpdated, 
  peFirmName,
  platformCompanyName
}: EditContactDialogProps) {
  const companyOptions = [
    ...(peFirmName ? [{ value: peFirmName, label: peFirmName }] : []),
    ...(platformCompanyName ? [{ value: platformCompanyName, label: platformCompanyName }] : []),
    { value: "Other", label: "Other" }
  ];
  
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    linkedin_url: "",
    company_type: "",
    is_primary_contact: false,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: contact.name || "",
        title: contact.title || "",
        email: contact.email || "",
        phone: contact.phone || "",
        linkedin_url: contact.linkedin_url || "",
        company_type: contact.company_type || "",
        is_primary_contact: contact.is_primary_contact || false,
      });
    }
  }, [open, contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      // If setting as primary, first unset any existing primary contact
      if (formData.is_primary_contact && !contact.is_primary_contact) {
        await supabase
          .from("buyer_contacts")
          .update({ is_primary_contact: false })
          .eq("buyer_id", buyerId);
      }

      const { error } = await supabase
        .from("buyer_contacts")
        .update({
          name: formData.name.trim(),
          title: formData.title.trim() || null,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          linkedin_url: formData.linkedin_url.trim() || null,
          company_type: formData.company_type || null,
          is_primary_contact: formData.is_primary_contact,
        })
        .eq("id", contact.id);

      if (error) throw error;

      toast.success("Contact updated successfully");
      setOpen(false);
      onContactUpdated();
    } catch (error) {
      console.error("Error updating contact:", error);
      toast.error("Failed to update contact");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("buyer_contacts")
        .delete()
        .eq("id", contact.id);

      if (error) throw error;

      toast.success("Contact deleted");
      setOpen(false);
      onContactUpdated();
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error("Failed to delete contact");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information for {contact.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Smith"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Managing Director"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-linkedin">LinkedIn URL</Label>
              <Input
                id="edit-linkedin"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/johnsmith"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-company_type">Company</Label>
              <Select
                value={formData.company_type}
                onValueChange={(value) => setFormData({ ...formData, company_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-is_primary"
                checked={formData.is_primary_contact}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_primary_contact: checked === true })
                }
              />
              <Label htmlFor="edit-is_primary" className="text-sm font-normal">
                Set as primary contact
              </Label>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
