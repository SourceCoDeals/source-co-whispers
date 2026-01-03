import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";

interface RemoveReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyerName: string;
  dealName: string;
  onConfirm: (categories: string[], reason: string, notes: string) => Promise<void>;
}

const REMOVE_CATEGORIES = [
  { value: "size_too_small", label: "Too Small for Buyer", description: "Deal size below their typical minimum" },
  { value: "size_too_large", label: "Too Large for Buyer", description: "Deal size above their typical maximum" },
  { value: "geography", label: "Geography Mismatch", description: "Deal location doesn't align with buyer focus" },
  { value: "services", label: "Wrong Services", description: "Service mix isn't what buyer targets" },
  { value: "timing", label: "Timing", description: "Buyer not actively looking right now" },
  { value: "portfolio_conflict", label: "Portfolio Conflict", description: "Would compete with existing portfolio" },
  { value: "data_quality", label: "Data Quality", description: "Not enough info to evaluate this buyer" },
  { value: "other", label: "Other", description: "Other reason (specify in notes)" },
];

export function RemoveReasonDialog({ open, onOpenChange, buyerName, dealName, onConfirm }: RemoveReasonDialogProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCategory = (value: string) => {
    setSelectedCategories(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const selectedReasons = selectedCategories
    .map(cat => REMOVE_CATEGORIES.find(c => c.value === cat)?.description)
    .filter(Boolean)
    .join("; ");

  const handleSubmit = async () => {
    if (selectedCategories.length === 0) return;
    setIsSubmitting(true);
    try {
      await onConfirm(selectedCategories, selectedReasons, notes);
      setSelectedCategories([]);
      setNotes("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedCategories([]);
      setNotes("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Remove Buyer from Deal
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Why is <span className="font-medium text-foreground">{buyerName}</span> not a fit for{" "}
              <span className="font-medium text-foreground">{dealName}</span>?
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This helps the system learn and improve future matching.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Select reason(s)</Label>
            <div className="grid gap-2 max-h-[300px] overflow-y-auto">
              {REMOVE_CATEGORIES.map((cat) => (
                <div 
                  key={cat.value} 
                  className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                  onClick={() => toggleCategory(cat.value)}
                >
                  <Checkbox 
                    checked={selectedCategories.includes(cat.value)}
                    onCheckedChange={() => toggleCategory(cat.value)}
                  />
                  <Label className="flex-1 cursor-pointer">
                    <span className="font-medium">{cat.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{cat.description}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional context about why this buyer isn't a fit..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit} 
            disabled={selectedCategories.length === 0 || isSubmitting}
          >
            {isSubmitting ? "Removing..." : "Remove from Deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
