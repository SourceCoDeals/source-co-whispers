import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Lightbulb } from "lucide-react";

// Generate a valid UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function NewTracker() {
  const [name, setName] = useState("");
  const [fitCriteria, setFitCriteria] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from("industry_trackers")
      .insert({ 
        industry_name: name.trim(), 
        user_id: generateUUID(),
        fit_criteria: fitCriteria.trim() || null,
      })
      .select()
      .single();
      
    if (error) { 
      toast({ title: "Error", description: error.message, variant: "destructive" }); 
      setIsLoading(false); 
      return; 
    }

    // Parse and save structured criteria if fit_criteria was provided
    if (fitCriteria.trim()) {
      try {
        const { data: parsedData } = await supabase.functions.invoke('parse-fit-criteria', {
          body: { fit_criteria: fitCriteria.trim() }
        });

        if (parsedData?.success) {
          await supabase
            .from("industry_trackers")
            .update({
              size_criteria: parsedData.size_criteria,
              service_criteria: parsedData.service_criteria,
              geography_criteria: parsedData.geography_criteria,
            })
            .eq("id", data.id);
        }
      } catch {
        // Silently continue - structured criteria is optional
      }
    }

    toast({ title: "Success", description: `${name} buyer universe created!` });
    navigate(`/trackers/${data.id}`);
  };

  const exampleCriteria = `Example for Collision Repair:
• Per store revenue above $1.2M
• Minimum 7,500 sq ft per store
• Geography and proximity to existing locations in TX/OK/LA
• Strong DRP or insurance relationships
• Prefer operators with 3+ locations
• No heavy truck or fleet-only shops`;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
        <h1 className="text-2xl font-display font-bold mb-2">Create Buyer Universe</h1>
        <p className="text-muted-foreground mb-6">Define a new industry vertical and what matters most when matching buyers to deals.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <Label htmlFor="name">Industry Name</Label>
            <Input 
              id="name" 
              placeholder="e.g., Residential Roofing, Collision Repair" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="mt-1" 
            />
          </div>

          <div className="bg-card rounded-lg border p-6">
            <div className="mb-4">
              <Label htmlFor="fitCriteria">What Matters for Buyer Fit</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Describe the key criteria that make a buyer a good fit for deals in this industry. 
                This will be used to score buyers when matching them to deals.
              </p>
            </div>

            <Textarea 
              id="fitCriteria"
              placeholder={exampleCriteria}
              value={fitCriteria}
              onChange={(e) => setFitCriteria(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />

            <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Tips for good criteria:</p>
                  <ul className="space-y-0.5">
                    <li>• Be specific about thresholds (revenue, size, count)</li>
                    <li>• Include geographic preferences or requirements</li>
                    <li>• Mention key relationships or certifications that matter</li>
                    <li>• Note any deal-breakers or exclusions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isLoading || !name.trim()} className="w-full">
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Universe
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
