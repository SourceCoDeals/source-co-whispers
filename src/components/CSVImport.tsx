import { useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, FileSpreadsheet, Sparkles, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
import type { TablesInsert, Tables } from "@/integrations/supabase/types";
import { normalizeDomain } from "@/lib/normalizeDomain";

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
          { key: 'hq_city_state', label: 'HQ City & State (combined)', description: '' },
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

  // Helper to get website values from a row based on current mapping
  const getRowWebsites = (row: string[]): { platform: string | null; peFirm: string | null } => {
    let platform: string | null = null;
    let peFirm: string | null = null;
    
    for (let i = 0; i < headers.length; i++) {
      const fieldValue = mapping[headers[i]];
      if (fieldValue === 'platform_website') {
        const value = row[i]?.trim();
        if (value) platform = value;
      }
      if (fieldValue === 'pe_firm_website') {
        const value = row[i]?.trim();
        if (value) peFirm = value;
      }
    }
    return { platform, peFirm };
  };

  // Compute valid/skipped rows based on website requirement (require BOTH websites)
  const { validRows, skippedRows, missingPlatformCount, missingPeFirmCount, missingBothCount } = useMemo(() => {
    const valid: string[][] = [];
    const skipped: string[][] = [];
    let missingPlatform = 0;
    let missingPeFirm = 0;
    let missingBoth = 0;
    
    for (const row of rows) {
      const { platform, peFirm } = getRowWebsites(row);
      const hasPlatform = !!platform;
      const hasPeFirm = !!peFirm;
      
      if (hasPlatform && hasPeFirm) {
        valid.push(row);
      } else {
        skipped.push(row);
        if (!hasPlatform && !hasPeFirm) {
          missingBoth++;
        } else if (!hasPlatform) {
          missingPlatform++;
        } else {
          missingPeFirm++;
        }
      }
    }
    
    return { 
      validRows: valid, 
      skippedRows: skipped,
      missingPlatformCount: missingPlatform,
      missingPeFirmCount: missingPeFirm,
      missingBothCount: missingBoth
    };
  }, [rows, mapping, headers]);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setIsLoading(true);

    try {
      // Parse only valid rows (those with BOTH websites) into buyer objects
      const parsedBuyers: Partial<TablesInsert<'buyers'>>[] = validRows.map((row) => {
        const buyer: Partial<TablesInsert<'buyers'>> = {
          tracker_id: trackerId,
          pe_firm_name: 'Unknown PE', // Required field default
        };
        
        headers.forEach((header, index) => {
          const fieldValue = mapping[header];
          if (fieldValue && fieldValue !== 'skip' && row[index]) {
            const value = row[index].trim();
            if (!value) return;
            
            // Handle combined city/state field - auto-split
            if (fieldValue === 'hq_city_state') {
              const parts = value.split(',').map(s => s.trim());
              if (parts.length >= 2) {
                buyer.hq_city = parts[0];
                buyer.hq_state = parts[parts.length - 1]; // Take last part as state
              } else {
                buyer.hq_city = value;
              }
            } else {
              const field = fieldValue as keyof TablesInsert<'buyers'>;
              (buyer as any)[field] = value;
            }
          }
        });
        
        return buyer;
      }).filter(b => b.platform_company_name || b.pe_firm_name !== 'Unknown PE');

      if (parsedBuyers.length === 0) {
        throw new Error('No valid buyers found. Make sure at least PE Firm or Platform Company is mapped and rows have both websites.');
      }

      // ============================================
      // STEP 1: DEDUPLICATE WITHIN CSV BY PLATFORM DOMAIN
      // ============================================
      // Group CSV rows by normalized platform domain BEFORE checking against database
      const csvByDomain = new Map<string, Partial<TablesInsert<'buyers'>>[]>();
      
      for (const buyer of parsedBuyers) {
        const domain = normalizeDomain(buyer.platform_website as string);
        if (domain) {
          if (!csvByDomain.has(domain)) {
            csvByDomain.set(domain, []);
          }
          csvByDomain.get(domain)!.push(buyer);
        } else {
          // Fallback: use platform name if no domain
          const name = (buyer.platform_company_name || '').toLowerCase().trim();
          if (name) {
            const key = `name:${name}`;
            if (!csvByDomain.has(key)) {
              csvByDomain.set(key, []);
            }
            csvByDomain.get(key)!.push(buyer);
          }
        }
      }

      // For each domain group, merge all PE firm names into one record
      const dedupedCsvBuyers: Partial<TablesInsert<'buyers'>>[] = [];
      let csvMergeCount = 0;
      
      for (const [_, domainBuyers] of csvByDomain) {
        // Pick the first as the "keeper"
        const keeper = { ...domainBuyers[0] };
        
        // Collect unique PE firm names from all rows
        const peFirmNames = new Set<string>();
        for (const b of domainBuyers) {
          const name = b.pe_firm_name?.trim();
          if (name && name !== 'Unknown PE') {
            peFirmNames.add(name);
          }
        }
        
        // If multiple PE firms found, combine them
        if (peFirmNames.size > 0) {
          keeper.pe_firm_name = Array.from(peFirmNames).join(' / ');
          if (peFirmNames.size > 1) {
            csvMergeCount += (domainBuyers.length - 1);
          }
        }
        
        dedupedCsvBuyers.push(keeper);
      }

      // ============================================
      // STEP 2: CHECK AGAINST DATABASE
      // ============================================
      // Fetch existing buyers in this tracker for duplicate detection
      const { data: existingBuyers } = await supabase
        .from("buyers")
        .select("id, platform_company_name, platform_website, pe_firm_name")
        .eq("tracker_id", trackerId);

      // Build lookup maps for duplicate detection
      const existingByPlatformName = new Map<string, Tables<'buyers'>>();
      const existingByDomain = new Map<string, Tables<'buyers'>>();
      
      existingBuyers?.forEach(buyer => {
        if (buyer.platform_company_name) {
          existingByPlatformName.set(buyer.platform_company_name.toLowerCase().trim(), buyer as Tables<'buyers'>);
        }
        if (buyer.platform_website) {
          const domain = normalizeDomain(buyer.platform_website);
          if (domain) existingByDomain.set(domain, buyer as Tables<'buyers'>);
        }
      });

      const toInsert: TablesInsert<'buyers'>[] = [];
      const toMerge: { id: string; newPeFirmName: string }[] = [];

      for (const buyer of dedupedCsvBuyers) {
        // Check for existing buyer by platform name or website domain
        let existingBuyer: Tables<'buyers'> | undefined;
        
        // Check by domain first (primary)
        if (buyer.platform_website) {
          const domain = normalizeDomain(buyer.platform_website as string);
          if (domain) existingBuyer = existingByDomain.get(domain);
        }
        // Fallback to name
        if (!existingBuyer && buyer.platform_company_name) {
          existingBuyer = existingByPlatformName.get((buyer.platform_company_name as string).toLowerCase().trim());
        }

        if (existingBuyer) {
          // Duplicate found - merge PE firm names if different
          const newPeFirms = (buyer.pe_firm_name as string)?.split('/').map(s => s.trim()).filter(s => s && s !== 'Unknown PE') || [];
          const existingPeFirms = existingBuyer.pe_firm_name?.split('/').map(s => s.trim()) || [];
          
          // Find PE firms that are new (not already in existing)
          const uniqueNewFirms = newPeFirms.filter(nf => 
            !existingPeFirms.some(ef => ef.toLowerCase() === nf.toLowerCase())
          );
          
          if (uniqueNewFirms.length > 0) {
            const combinedName = existingBuyer.pe_firm_name 
              ? `${existingBuyer.pe_firm_name} / ${uniqueNewFirms.join(' / ')}`
              : uniqueNewFirms.join(' / ');
            toMerge.push({ id: existingBuyer.id, newPeFirmName: combinedName });
          }
        } else {
          // New buyer - add to insert list AND update lookup maps immediately
          // This prevents sequential CSV rows for the same platform from being inserted as duplicates
          const newBuyer = buyer as TablesInsert<'buyers'>;
          toInsert.push(newBuyer);
          
          // Update lookup maps so subsequent buyers see this one
          if (buyer.platform_website) {
            const domain = normalizeDomain(buyer.platform_website as string);
            if (domain) {
              // Create a fake "existing" buyer to use for subsequent merges
              const fakeBuyer = {
                id: `pending-${toInsert.length}`,
                platform_company_name: buyer.platform_company_name as string,
                platform_website: buyer.platform_website as string,
                pe_firm_name: buyer.pe_firm_name as string,
              } as Tables<'buyers'>;
              existingByDomain.set(domain, fakeBuyer);
              if (buyer.platform_company_name) {
                existingByPlatformName.set((buyer.platform_company_name as string).toLowerCase().trim(), fakeBuyer);
              }
            }
          }
        }
      }

      // Insert new buyers
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from("buyers").insert(toInsert);
        if (insertError) throw insertError;
      }

      // Merge PE firms for duplicates
      for (const merge of toMerge) {
        await supabase
          .from("buyers")
          .update({ pe_firm_name: merge.newPeFirmName })
          .eq("id", merge.id);
      }

      // Build result message
      const parts: string[] = [];
      if (toInsert.length > 0) {
        parts.push(`${toInsert.length} new buyers imported`);
      }
      if (toMerge.length > 0) {
        parts.push(`${toMerge.length} existing buyers updated with additional PE firms`);
      }
      if (csvMergeCount > 0) {
        parts.push(`${csvMergeCount} duplicate rows in CSV merged`);
      }
      if (skippedRows.length > 0) {
        parts.push(`${skippedRows.length} rows skipped (missing website)`);
      }
      
      const message = parts.join('. ') + '.';
      
      toast({ title: "Import successful", description: message });
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

              {skippedRows.length > 0 ? (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-500 mb-1">{skippedRows.length} rows will be skipped (require both websites)</p>
                    <ul className="text-muted-foreground text-xs space-y-0.5">
                      {missingBothCount > 0 && <li>• {missingBothCount} missing both websites</li>}
                      {missingPlatformCount > 0 && <li>• {missingPlatformCount} missing platform website</li>}
                      {missingPeFirmCount > 0 && <li>• {missingPeFirmCount} missing PE firm website</li>}
                    </ul>
                    <p className="mt-1">Only <span className="font-medium">{validRows.length}</span> rows will be imported.</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {validRows.length} rows will be imported (all have both platform & PE firm websites)
                </p>
              )}
            </div>
          )}

          {/* Step 3: Preview (optional, can skip) */}
          {step === 'preview' && (
            <div className="space-y-3">
              {skippedRows.length > 0 ? (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p><span className="font-medium">{validRows.length}</span> buyers will be imported.</p>
                    <p className="text-amber-500 font-medium">{skippedRows.length} skipped (missing website)</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-medium">{validRows.length} buyers ready to import</p>
              )}
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
                    {validRows.slice(0, 10).map((row, rowIdx) => (
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
                    {validRows.length > 10 && (
                      <tr>
                        <td colSpan={headers.length} className="p-2 text-center text-muted-foreground">
                          ...and {validRows.length - 10} more
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
              <Button onClick={handleImport} disabled={validRows.length === 0 || isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import {validRows.length} Buyers
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
