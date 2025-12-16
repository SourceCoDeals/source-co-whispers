import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, MapPin, Briefcase, DollarSign, Target } from "lucide-react";

// Generate a valid UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface WeightConfig {
  serviceMix: number;
  geography: number;
  size: number;
  ownerGoals: number;
}

export default function NewTracker() {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [weights, setWeights] = useState<WeightConfig>({
    serviceMix: 25,
    geography: 25,
    size: 25,
    ownerGoals: 25,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalWeight = weights.serviceMix + weights.geography + weights.size + weights.ownerGoals;

  const handleWeightChange = (key: keyof WeightConfig, value: number[]) => {
    setWeights(prev => ({ ...prev, [key]: value[0] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from("industry_trackers")
      .insert({ 
        industry_name: name.trim(), 
        user_id: generateUUID(),
        service_mix_weight: weights.serviceMix,
        geography_weight: weights.geography,
        size_weight: weights.size,
        owner_goals_weight: weights.ownerGoals,
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

  const weightItems = [
    { key: 'serviceMix' as const, label: 'Service Mix', icon: Briefcase, description: 'How important is matching specific services/products?' },
    { key: 'geography' as const, label: 'Geography', icon: MapPin, description: 'How critical is geographic alignment?' },
    { key: 'size' as const, label: 'Size (Revenue/EBITDA)', icon: DollarSign, description: 'How much does company size matter?' },
    { key: 'ownerGoals' as const, label: 'Owner Goals', icon: Target, description: 'How important is alignment with seller objectives?' },
  ];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
        <h1 className="text-2xl font-display font-bold mb-2">Create Buyer Universe</h1>
        <p className="text-muted-foreground mb-6">Define a new industry vertical and calibrate scoring weights for buyer matching.</p>
        
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Score Calibration</h2>
                <p className="text-sm text-muted-foreground">Adjust weights based on what matters most in this industry.</p>
              </div>
              <div className={`text-sm font-medium px-3 py-1 rounded-full ${totalWeight === 100 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                Total: {totalWeight}%
              </div>
            </div>

            <div className="space-y-6">
              {weightItems.map(({ key, label, icon: Icon, description }) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{label}</span>
                    </div>
                    <span className="text-sm font-semibold text-primary">{weights[key]}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{description}</p>
                  <Slider
                    value={[weights[key]]}
                    onValueChange={(value) => handleWeightChange(key, value)}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              ))}
            </div>

            {totalWeight !== 100 && (
              <p className="text-sm text-destructive mt-4">
                Weights should add up to 100% for optimal scoring.
              </p>
            )}
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
