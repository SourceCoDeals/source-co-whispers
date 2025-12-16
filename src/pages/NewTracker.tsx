import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

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
        user_id: generateUUID() 
      })
      .select()
      .single();
      
    if (error) { 
      toast({ title: "Error", description: error.message, variant: "destructive" }); 
      setIsLoading(false); 
      return; 
    }
    toast({ title: "Success", description: `${name} buyer universe created!` });
    navigate(`/trackers/${data.id}`);
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
        <h1 className="text-2xl font-display font-bold mb-2">Create Buyer Universe</h1>
        <p className="text-muted-foreground mb-6">Define a new industry vertical to build your curated buyer universe.</p>
        <form onSubmit={handleSubmit} className="space-y-4 bg-card rounded-lg border p-6">
          <div>
            <Label htmlFor="name">Industry Name</Label>
            <Input 
              id="name" 
              placeholder="e.g., Residential Roofing, Collision Repair" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="mt-1" 
            />
          </div>
          <Button type="submit" disabled={isLoading || !name.trim()}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Universe
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
