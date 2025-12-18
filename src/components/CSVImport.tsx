import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, FileSpreadsheet, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import type { TablesInsert } from "@/integrations/supabase/types";

interface CSVImportProps {
  trackerId: string;
  onComplete: () => void;
}

interface AvailableField {
  key: string;
  label: string;
  description: string;
}

type ImportStep = 'upload' | 'mapping' | 'preview';

export function CSVImport({ trackerId, onComplete }: CSVImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [availableFields, setAvailableFields] = useState<AvailableField[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.trim().split("\n");
    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(parseCSVLine).filter(row => row.some(cell => cell.trim()));
    return { headers, rows };
  };

  const parseCSVLine = (line: string): string[] => {
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
    return fields;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setIsAnalyzing(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const { headers: parsedHeaders, rows: parsedRows } = parseCSV(text);
      
      setHeaders(parsedHeaders);
      setRows(parsedRows);
      
      // Call AI to get column mapping suggestions
      try {
        const { data, error } = await supabase.functions.invoke('map-csv-columns', {
          body: { 
            headers: parsedHeaders, 
            sampleRows: parsedRows.slice(0, 3) 
          }
        });
        
        if (error) throw error;
        
        setMapping(data.mapping || {});
        setAvailableFields(data.availableFields || []);
        setStep('mapping');
      } catch (err: any) {
        console.error('AI mapping error:', err);
        toast({ 
          title: "AI Analysis Failed", 
          description: "Using basic column detection. You can manually adjust mappings.",
          variant: "destructive" 
        });
        // Fallback: set empty mapping, let user map manually
        setMapping({});
        setAvailableFields([
          { key: 'platform_company_name', label: 'Platform Company', description: '' },
          { key: 'platform_website', label: 'Platform Website', description: '' },
          { key: 'pe_firm_name', label: 'PE Firm Name', description: '' },
          { key: 'pe_firm_website', label: 'PE Firm Website', description: '' },
          { key: 'hq_city', label: 'HQ City', description: '' },
          { key: 'hq_state', label: 'HQ State', description: '' },
          { key: 'hq_country', label: 'HQ Country', description: '' },
          { key: 'skip', label: 'Skip (Do Not Import)', description: '' },
        ]);
        setStep('mapping');
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsText(file);
  };

  const updateMapping = (header: string, field: string) => {
    setMapping(prev => ({ ...prev, [header]: field }));
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setIsLoading(true);

    try {
      const buyersToInsert: TablesInsert<'buyers'>[] = rows.map((row) => {
        const buyer: Partial<TablesInsert<'buyers'>> = {
          tracker_id: trackerId,
          pe_firm_name: 'Unknown PE', // Required field default
        };
        
        headers.forEach((header, index) => {
          const fieldValue = mapping[header];
          if (fieldValue && fieldValue !== 'skip' && row[index]) {
            const field = fieldValue as keyof TablesInsert<'buyers'>;
            const value = row[index].trim();
            if (!value) return;
            
            // All basic fields are strings
            (buyer as any)[field] = value;
          }
        });
        
        return buyer as TablesInsert<'buyers'>;
      }).filter(b => b.platform_company_name || b.pe_firm_name !== 'Unknown PE');

      if (buyersToInsert.length === 0) {
        throw new Error('No valid buyers found. Make sure at least PE Firm or Platform Company is mapped.');
      }

      const { error } = await supabase.from("buyers").insert(buyersToInsert);
      
      if (error) throw error;
      
      toast({ title: "Import successful", description: `${buyersToInsert.length} buyers imported.` });
      resetAndClose();
      onComplete();
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setIsOpen(false);
    setStep('upload');
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
  };

  const getMappedFieldLabel = (fieldKey: string) => {
    const field = availableFields.find(f => f.key === fieldKey);
    return field?.label || fieldKey;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetAndClose(); else setIsOpen(true); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'upload' && 'Import Buyers from CSV'}
            {step === 'mapping' && (
              <>
                <Sparkles className="w-5 h-5 text-primary" />
                AI Column Mapping
              </>
            )}
            {step === 'preview' && 'Import Preview'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-4 pt-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv" 
                onChange={handleFileSelect} 
                className="hidden" 
              />
              {isAnalyzing ? (
                <div className="space-y-3">
                  <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
                  <p className="font-medium">Analyzing CSV with AI...</p>
                  <p className="text-sm text-muted-foreground">Detecting column mappings</p>
                </div>
              ) : (
                <>
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">Click to upload CSV</p>
                  <p className="text-sm text-muted-foreground">AI will automatically detect column mappings</p>
                </>
              )}
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-sm">
                  AI has suggested mappings below. Review and adjust if needed.
                </p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">CSV Column</th>
                      <th className="text-left p-3 font-medium">Maps To</th>
                      <th className="text-left p-3 font-medium">Sample Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {headers.map((header, idx) => (
                      <tr key={header} className="hover:bg-muted/30">
                        <td className="p-3 font-medium">{header}</td>
                        <td className="p-3">
                          <Select 
                            value={mapping[header] || 'skip'} 
                            onValueChange={(val) => updateMapping(header, val)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFields.map(field => (
                                <SelectItem key={field.key} value={field.key}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 text-muted-foreground truncate max-w-[200px]">
                          {rows[0]?.[idx] || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-muted-foreground">
                {rows.length} rows will be imported
              </p>
            </div>
          )}

          {/* Step 3: Preview (optional, can skip) */}
          {step === 'preview' && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{rows.length} buyers ready to import</p>
              <div className="max-h-60 overflow-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      {Object.entries(mapping)
                        .filter(([_, field]) => field !== 'skip')
                        .map(([header, field]) => (
                          <th key={header} className="text-left p-2 font-medium">
                            {getMappedFieldLabel(field)}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.slice(0, 10).map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {headers.map((header, colIdx) => {
                          if (mapping[header] === 'skip') return null;
                          return (
                            <td key={colIdx} className="p-2 truncate max-w-[150px]">
                              {row[colIdx] || '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {rows.length > 10 && (
                      <tr>
                        <td colSpan={headers.length} className="p-2 text-center text-muted-foreground">
                          ...and {rows.length - 10} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 justify-between pt-4 border-t">
          <div>
            {step !== 'upload' && (
              <Button 
                variant="ghost" 
                onClick={() => setStep(step === 'preview' ? 'mapping' : 'upload')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
            {step === 'mapping' && (
              <Button onClick={() => setStep('preview')}>
                Preview
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            {step === 'preview' && (
              <Button onClick={handleImport} disabled={rows.length === 0 || isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import {rows.length} Buyers
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
