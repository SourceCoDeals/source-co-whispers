import { useState } from "react";
import { Plus } from "lucide-react";
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

interface AddContactDialogProps {
  buyerId: string;
  onContactAdded: () => void;
  existingContactsCount?: number;
  trigger?: React.ReactNode;
  peFirmName?: string;
  platformCompanyName?: string;
}

export function AddContactDialog({ 
  buyerId, 
  onContactAdded, 
  existingContactsCount = 0,
  trigger,
  peFirmName,
  platformCompanyName
}: AddContactDialogProps) {
  // Build dynamic company options based on actual buyer data
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

  const resetForm = () => {
    setFormData({
      name: "",
      title: "",
      email: "",
      phone: "",
      linkedin_url: "",
      company_type: "",
      is_primary_contact: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      // If setting as primary, first unset any existing primary contact
      if (formData.is_primary_contact) {
        await supabase
          .from("buyer_contacts")
          .update({ is_primary_contact: false })
          .eq("buyer_id", buyerId);
      }

      // Insert the new contact
      const { error } = await supabase.from("buyer_contacts").insert({
        buyer_id: buyerId,
        name: formData.name.trim(),
        title: formData.title.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        linkedin_url: formData.linkedin_url.trim() || null,
        company_type: formData.company_type || null,
        is_primary_contact: formData.is_primary_contact || existingContactsCount === 0,
      });

      if (error) throw error;

      toast.success("Contact added successfully");
      resetForm();
      setOpen(false);
      onContactAdded();
    } catch (error) {
      console.error("Error adding contact:", error);
      toast.error("Failed to add contact");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Add a new contact for this buyer. {existingContactsCount === 0 && "This will be set as the primary contact."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Smith"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Managing Director"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input
                id="linkedin"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/johnsmith"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company_type">Company</Label>
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
            {existingContactsCount > 0 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_primary"
                  checked={formData.is_primary_contact}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_primary_contact: checked === true })
                  }
                />
                <Label htmlFor="is_primary" className="text-sm font-normal">
                  Set as primary contact
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
