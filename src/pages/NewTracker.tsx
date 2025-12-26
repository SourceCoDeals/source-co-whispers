import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Lightbulb, Upload, FileText, X } from "lucide-react";
import { TrackerNotesSection } from "@/components/TrackerNotesSection";

interface UploadedDoc {
  name: string;
  path: string;
  size: number;
}

export default function NewTracker() {
  const [name, setName] = useState("");
  const [sizeCriteria, setSizeCriteria] = useState("");
  const [serviceCriteria, setServiceCriteria] = useState("");
  const [geographyCriteria, setGeographyCriteria] = useState("");
  const [buyerTypesCriteria, setBuyerTypesCriteria] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to upload files", variant: "destructive" });
      setIsUploading(false);
      return;
    }

    const newDocs: UploadedDoc[] = [];
    for (const file of Array.from(files)) {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("tracker-documents").upload(filePath, file);
      
      if (error) {
        toast({ title: "Upload failed", description: `Failed to upload ${file.name}`, variant: "destructive" });
        continue;
      }
      
      newDocs.push({ name: file.name, path: filePath, size: file.size });
    }

    setUploadedDocs(prev => [...prev, ...newDocs]);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeDoc = async (doc: UploadedDoc) => {
    await supabase.storage.from("tracker-documents").remove([doc.path]);
    setUploadedDocs(prev => prev.filter(d => d.path !== doc.path));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create a buyer universe", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    // Combine all criteria text for legacy fit_criteria field
    const combinedCriteria = [
      sizeCriteria && `Size: ${sizeCriteria}`,
      serviceCriteria && `Service: ${serviceCriteria}`,
      geographyCriteria && `Geography: ${geographyCriteria}`,
      buyerTypesCriteria && `Buyer Types: ${buyerTypesCriteria}`
    ].filter(Boolean).join('\n\n');
    
    const { data, error } = await supabase
      .from("industry_trackers")
      .insert({ 
        industry_name: name.trim(), 
        user_id: user.id,
        fit_criteria: combinedCriteria || null,
        fit_criteria_size: sizeCriteria.trim() || null,
        fit_criteria_service: serviceCriteria.trim() || null,
        fit_criteria_geography: geographyCriteria.trim() || null,
        fit_criteria_buyer_types: buyerTypesCriteria.trim() || null,
        documents: uploadedDocs.length > 0 ? uploadedDocs : null,
      } as any)
      .select()
      .single();
      
    if (error) { 
      toast({ title: "Error", description: error.message, variant: "destructive" }); 
      setIsLoading(false); 
      return; 
    }

    // Parse fit criteria into structured JSONB fields
    const hasCriteria = sizeCriteria.trim() || serviceCriteria.trim() || geographyCriteria.trim() || buyerTypesCriteria.trim();
    if (hasCriteria) {
      try {
        const criteriaText = `Size Criteria: ${sizeCriteria}\n\nService/Product Criteria: ${serviceCriteria}\n\nGeography Criteria: ${geographyCriteria}\n\nBuyer Types: ${buyerTypesCriteria}`;
        const { data: parsedData } = await supabase.functions.invoke('parse-fit-criteria', {
          body: { fit_criteria: criteriaText }
        });

        if (parsedData?.success) {
          await supabase
            .from("industry_trackers")
            .update({
              size_criteria: parsedData.size_criteria,
              service_criteria: parsedData.service_criteria,
              geography_criteria: parsedData.geography_criteria,
              buyer_types_criteria: parsedData.buyer_types_criteria,
            })
            .eq("id", data.id);
        }
      } catch {
        // Silently continue - structured criteria is optional
      }
    }

    // If documents were uploaded, trigger document analysis in the background
    if (uploadedDocs.length > 0) {
      toast({ title: "Success", description: `${name} created! Analyzing documents...` });
      
      // Fire off document analysis (don't await - let it run in background)
      supabase.functions.invoke('parse-tracker-documents', {
        body: { tracker_id: data.id }
      }).then(({ data: analysisData, error: analysisError }) => {
        if (analysisError || !analysisData?.success) {
          console.error('Document analysis failed:', analysisError || analysisData?.error);
        }
      });

      navigate(`/trackers/${data.id}`);
    } else {
      toast({ title: "Success", description: `${name} buyer universe created!` });
      navigate(`/trackers/${data.id}`);
    }
  };

  const handleApplyExtracted = (data: {
    industryName?: string;
    sizeCriteria: string;
    serviceCriteria: string;
    geographyCriteria: string;
    buyerTypesCriteria: string;
  }) => {
    if (data.industryName && !name.trim()) {
      setName(data.industryName);
    }
    if (data.sizeCriteria) {
      setSizeCriteria(prev => prev ? `${prev}\n${data.sizeCriteria}` : data.sizeCriteria);
    }
    if (data.serviceCriteria) {
      setServiceCriteria(prev => prev ? `${prev}\n${data.serviceCriteria}` : data.serviceCriteria);
    }
    if (data.geographyCriteria) {
      setGeographyCriteria(prev => prev ? `${prev}\n${data.geographyCriteria}` : data.geographyCriteria);
    }
    if (data.buyerTypesCriteria) {
      setBuyerTypesCriteria(prev => prev ? `${prev}\n${data.buyerTypesCriteria}` : data.buyerTypesCriteria);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
        <h1 className="text-2xl font-display font-bold mb-2">Create Buyer Universe</h1>
        <p className="text-muted-foreground mb-6">Define a new industry vertical and what matters most when matching buyers to deals.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <TrackerNotesSection onApply={handleApplyExtracted} />

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
              <Label>What Matters for Buyer Fit</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Describe the key criteria that make a buyer a good fit for deals in this industry.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sizeCriteria" className="text-sm">Size Criteria</Label>
                <Textarea 
                  id="sizeCriteria"
                  placeholder="Min revenue: $5M+&#10;EBITDA: $1M-$10M&#10;EBITDA Multiple: 3x-8x&#10;Locations: 3+"
                  value={sizeCriteria}
                  onChange={(e) => setSizeCriteria(e.target.value)}
                  className="mt-1 min-h-[120px] font-mono text-sm"
                />
              </div>
              
              <div>
                <Label htmlFor="serviceCriteria" className="text-sm">Service/Product Mix</Label>
                <Textarea 
                  id="serviceCriteria"
                  placeholder="Required: DRP programs&#10;Preferred: OEM certifications&#10;Excluded: Heavy truck only"
                  value={serviceCriteria}
                  onChange={(e) => setServiceCriteria(e.target.value)}
                  className="mt-1 min-h-[120px] font-mono text-sm"
                />
              </div>
              
              <div>
                <Label htmlFor="geographyCriteria" className="text-sm">Geography</Label>
                <Textarea 
                  id="geographyCriteria"
                  placeholder="Preferred: TX, OK, LA&#10;Coverage: Regional&#10;Excluded: Northeast"
                  value={geographyCriteria}
                  onChange={(e) => setGeographyCriteria(e.target.value)}
                  className="mt-1 min-h-[120px] font-mono text-sm"
                />
              </div>
              
              <div>
                <Label htmlFor="buyerTypesCriteria" className="text-sm">Buyer Types</Label>
                <Textarea 
                  id="buyerTypesCriteria"
                  placeholder="1. Large MSOs: 50+ locations, national&#10;2. Regional MSOs: 6-50 locations&#10;3. PE Platform Seekers"
                  value={buyerTypesCriteria}
                  onChange={(e) => setBuyerTypesCriteria(e.target.value)}
                  className="mt-1 min-h-[120px] font-mono text-sm"
                />
              </div>
            </div>

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

          <div className="bg-card rounded-lg border p-6">
            <div className="mb-4">
              <Label>Supporting Documents (Optional)</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Upload any documents that provide context about this buyer universe, such as investment memos, thesis documents, or market research.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.pptx,.ppt"
            />

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full border-dashed"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {isUploading ? "Uploading..." : "Upload Documents"}
            </Button>

            {uploadedDocs.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadedDocs.map((doc) => (
                  <div key={doc.path} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{doc.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">({formatFileSize(doc.size)})</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDoc(doc)}
                      className="shrink-0 h-6 w-6"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
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
