import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

export interface AddBuyerDialogProps {
  onAdd: (buyer: {
    pe_firm_name: string;
    pe_firm_website: string;
    platform_company_name: string;
    platform_website: string;
  }) => Promise<void>;
}

export function AddBuyerDialog({ onAdd }: AddBuyerDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    pe_firm_name: '',
    pe_firm_website: '',
    platform_company_name: '',
    platform_website: '',
  });

  const handleSubmit = async () => {
    if (!formData.pe_firm_name.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAdd(formData);
      setFormData({
        pe_firm_name: '',
        pe_firm_website: '',
        platform_company_name: '',
        platform_website: '',
      });
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Buyer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Buyer</DialogTitle>
          <DialogDescription>
            Add a new buyer to this tracker. At minimum, provide the PE firm name.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pe_firm_name">PE Firm Name *</Label>
            <Input
              id="pe_firm_name"
              value={formData.pe_firm_name}
              onChange={(e) => setFormData({ ...formData, pe_firm_name: e.target.value })}
              placeholder="e.g., Shore Capital Partners"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pe_firm_website">PE Firm Website</Label>
            <Input
              id="pe_firm_website"
              value={formData.pe_firm_website}
              onChange={(e) => setFormData({ ...formData, pe_firm_website: e.target.value })}
              placeholder="e.g., shorecap.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="platform_company_name">Platform Company Name</Label>
            <Input
              id="platform_company_name"
              value={formData.platform_company_name}
              onChange={(e) => setFormData({ ...formData, platform_company_name: e.target.value })}
              placeholder="e.g., ABC Services"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="platform_website">Platform Website</Label>
            <Input
              id="platform_website"
              value={formData.platform_website}
              onChange={(e) => setFormData({ ...formData, platform_website: e.target.value })}
              placeholder="e.g., abcservices.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.pe_firm_name.trim() || isSubmitting}>
            Add Buyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
