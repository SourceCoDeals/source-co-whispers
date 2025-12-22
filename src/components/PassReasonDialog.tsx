import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { XCircle } from "lucide-react";

interface PassReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyerName: string;
  dealName: string;
  onConfirm: (category: string, reason: string, notes: string) => Promise<void>;
}

const PASS_CATEGORIES = [
  { value: "geography", label: "Geography", description: "Not in our target geography" },
  { value: "size_too_small", label: "Too Small", description: "Deal size below their minimum" },
  { value: "size_too_large", label: "Too Large", description: "Deal size above their maximum" },
  { value: "services", label: "Wrong Services", description: "Service mix doesn't align" },
  { value: "timing", label: "Timing", description: "Not actively acquiring right now" },
  { value: "portfolio_conflict", label: "Portfolio Conflict", description: "Competes with existing portfolio company" },
  { value: "industry", label: "Industry Mismatch", description: "Not in their target industries" },
  { value: "other", label: "Other", description: "Other reason (specify in notes)" },
];

export function PassReasonDialog({ open, onOpenChange, buyerName, dealName, onConfirm }: PassReasonDialogProps) {
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCategory = PASS_CATEGORIES.find(c => c.value === category);
  const reason = selectedCategory?.description || "";

  const handleSubmit = async () => {
    if (!category) return;
    setIsSubmitting(true);
    try {
      await onConfirm(category, reason, notes);
      setCategory("");
      setNotes("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            Mark as Passed
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{buyerName}</span> passed on{" "}
              <span className="font-medium text-foreground">{dealName}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label>Why did they pass?</Label>
            <RadioGroup value={category} onValueChange={setCategory} className="grid gap-2">
              {PASS_CATEGORIES.map((cat) => (
                <div key={cat.value} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                  <RadioGroupItem value={cat.value} id={cat.value} />
                  <Label htmlFor={cat.value} className="flex-1 cursor-pointer">
                    <span className="font-medium">{cat.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{cat.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any specific feedback from the buyer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit} 
            disabled={!category || isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Mark as Passed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
