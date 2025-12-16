import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, FileSpreadsheet, Check } from "lucide-react";

interface CSVImportProps {
  trackerId: string;
  onComplete: () => void;
}

interface ParsedBuyer {
  pe_firm_name: string;
  platform_company_name: string;
  services_offered: string;
  location: string;
}

export function CSVImport({ trackerId, onComplete }: CSVImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<ParsedBuyer[]>([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseCSV = (text: string): ParsedBuyer[] => {
    const lines = text.trim().split("\n");
    const headers = lines[0].toLowerCase();
    
    // Try to detect column mapping
    const hasStandardFormat = headers.includes("platform") || headers.includes("pe") || headers.includes("buyer");
    
    return lines.slice(1).map((line) => {
      // Handle quoted fields with commas
      const fields: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          fields.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      fields.push(current.trim());

      // Map fields based on expected format: Platform, Location, Description, PE Buyer
      return {
        platform_company_name: fields[0] || "",
        location: fields[1] || "",
        services_offered: fields[2] || "",
        pe_firm_name: fields[3] || fields[0] || "Unknown PE",
      };
    }).filter((b) => b.platform_company_name || b.pe_firm_name);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setPreview(parsed);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setIsLoading(true);

    try {
      // Extract state from location
      const extractState = (location: string): string[] => {
        const stateMatch = location.match(/([A-Z]{2}),?\s*(United States|Canada)?/);
        if (stateMatch) return [stateMatch[1]];
        if (location.includes("United States")) return ["National"];
        return [];
      };

      const buyersToInsert = preview.map((b) => ({
        tracker_id: trackerId,
        pe_firm_name: b.pe_firm_name,
        platform_company_name: b.platform_company_name,
        services_offered: b.services_offered,
        geographic_footprint: extractState(b.location),
        business_model: "Corporate",
      }));

      const { error } = await supabase.from("buyers").insert(buyersToInsert);
      
      if (error) throw error;
      
      toast({ title: "Import successful", description: `${preview.length} buyers imported.` });
      setIsOpen(false);
      setPreview([]);
      setFileName("");
      onComplete();
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Buyers from CSV</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div 
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv" 
              onChange={handleFileSelect} 
              className="hidden" 
            />
            <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            {fileName ? (
              <div className="flex items-center justify-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span>{fileName}</span>
              </div>
            ) : (
              <>
                <p className="font-medium">Click to upload CSV</p>
                <p className="text-sm text-muted-foreground">Expected format: Platform, Location, Description, PE Buyer</p>
              </>
            )}
          </div>

          {preview.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{preview.length} buyers found</p>
              <div className="max-h-60 overflow-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">PE Firm</th>
                      <th className="text-left p-2 font-medium">Platform</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.slice(0, 10).map((b, i) => (
                      <tr key={i}>
                        <td className="p-2">{b.pe_firm_name}</td>
                        <td className="p-2 text-muted-foreground">{b.platform_company_name}</td>
                      </tr>
                    ))}
                    {preview.length > 10 && (
                      <tr><td colSpan={2} className="p-2 text-center text-muted-foreground">...and {preview.length - 10} more</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={preview.length === 0 || isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import {preview.length} Buyers
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
