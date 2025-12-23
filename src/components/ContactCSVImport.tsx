import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, FileSpreadsheet, Sparkles, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
import { parseCSV } from "@/lib/csvParser";
import type { TablesInsert } from "@/integrations/supabase/types";

interface ContactCSVImportProps {
  buyerId: string;
  onComplete: () => void;
}

interface AvailableField {
  key: string;
  label: string;
  description: string;
}

interface DuplicateInfo {
  csvRowIndex: number;
  csvEmail: string;
  csvName: string;
  existingContact: {
    id: string;
    name: string;
    email: string;
  };
}

type ImportStep = 'upload' | 'mapping' | 'duplicates' | 'preview';
type DuplicateResolution = 'csv' | 'existing' | 'skip';

export function ContactCSVImport({ buyerId, onComplete }: ContactCSVImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [availableFields, setAvailableFields] = useState<AvailableField[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [duplicateResolutions, setDuplicateResolutions] = useState<Record<number, DuplicateResolution>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
        const { data, error } = await supabase.functions.invoke('map-contact-columns', {
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
        // Fallback: set default fields
        setMapping({});
        setAvailableFields([
          { key: 'name', label: 'Contact Name', description: '' },
          { key: 'title', label: 'Title/Role', description: '' },
          { key: 'company_type', label: 'Company (Platform/PE)', description: '' },
          { key: 'email', label: 'Email', description: '' },
          { key: 'phone', label: 'Phone', description: '' },
          { key: 'linkedin_url', label: 'LinkedIn', description: '' },
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

  // Check for duplicate emails after mapping is confirmed
  const checkForDuplicates = async () => {
    setIsCheckingDuplicates(true);
    
    try {
      // Get email column index
      const emailHeader = Object.entries(mapping).find(([_, value]) => value === 'email')?.[0];
      const emailIndex = emailHeader ? headers.indexOf(emailHeader) : -1;
      
      if (emailIndex === -1) {
        // No email column mapped, skip duplicate check
        setStep('preview');
        return;
      }
      
      // Extract emails from CSV
      const csvEmails = rows
        .map((row, index) => ({ email: row[emailIndex]?.trim().toLowerCase(), index }))
        .filter(item => item.email);
      
      if (csvEmails.length === 0) {
        setStep('preview');
        return;
      }
      
      // Fetch existing contacts for this buyer
      const { data: existingContacts, error } = await supabase
        .from('buyer_contacts')
        .select('id, name, email')
        .eq('buyer_id', buyerId)
        .not('email', 'is', null);
      
      if (error) throw error;
      
      // Find duplicates
      const existingEmailsMap = new Map(
        (existingContacts || [])
          .filter(c => c.email)
          .map(c => [c.email!.toLowerCase(), c])
      );
      
      const foundDuplicates: DuplicateInfo[] = [];
      const nameHeader = Object.entries(mapping).find(([_, value]) => value === 'name')?.[0];
      const nameIndex = nameHeader ? headers.indexOf(nameHeader) : -1;
      
      csvEmails.forEach(({ email, index }) => {
        const existing = existingEmailsMap.get(email);
        if (existing) {
          foundDuplicates.push({
            csvRowIndex: index,
            csvEmail: email,
            csvName: nameIndex >= 0 ? rows[index][nameIndex] || 'Unknown' : 'Unknown',
            existingContact: {
              id: existing.id,
              name: existing.name,
              email: existing.email!
            }
          });
        }
      });
      
      if (foundDuplicates.length > 0) {
        setDuplicates(foundDuplicates);
        // Default to keeping existing
        const defaultResolutions: Record<number, DuplicateResolution> = {};
        foundDuplicates.forEach(d => {
          defaultResolutions[d.csvRowIndex] = 'existing';
        });
        setDuplicateResolutions(defaultResolutions);
        setStep('duplicates');
      } else {
        setStep('preview');
      }
    } catch (err) {
      console.error('Error checking duplicates:', err);
      toast({ 
        title: "Duplicate check failed", 
        description: "Proceeding without duplicate detection.",
        variant: "destructive" 
      });
      setStep('preview');
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setIsLoading(true);

    try {
      // Build set of row indices to skip
      const skipIndices = new Set<number>();
      duplicates.forEach(d => {
        const resolution = duplicateResolutions[d.csvRowIndex];
        if (resolution === 'skip' || resolution === 'existing') {
          skipIndices.add(d.csvRowIndex);
        }
      });
      
      const contactsToInsert: TablesInsert<'buyer_contacts'>[] = rows
        .map((row, rowIndex) => {
          // Skip rows marked as skip or existing
          if (skipIndices.has(rowIndex)) return null;
          
          const contact: Partial<TablesInsert<'buyer_contacts'>> = {
            buyer_id: buyerId,
            name: 'Unknown', // Required field default
            source: 'csv_import',
          };
          
          headers.forEach((header, colIndex) => {
            const fieldValue = mapping[header];
            if (fieldValue && fieldValue !== 'skip' && row[colIndex]) {
              const value = row[colIndex].trim();
              if (!value) return;
              
              const field = fieldValue as keyof TablesInsert<'buyer_contacts'>;
              (contact as any)[field] = value;
            }
          });
          
          return contact as TablesInsert<'buyer_contacts'>;
        })
        .filter((c): c is TablesInsert<'buyer_contacts'> => c !== null && c.name !== 'Unknown');

      if (contactsToInsert.length === 0) {
        throw new Error('No valid contacts to import after applying duplicate resolutions.');
      }

      const { error } = await supabase.from("buyer_contacts").insert(contactsToInsert);
      
      if (error) throw error;
      
      const skippedCount = skipIndices.size;
      const message = skippedCount > 0 
        ? `${contactsToInsert.length} contacts imported, ${skippedCount} duplicates skipped.`
        : `${contactsToInsert.length} contacts imported.`;
      
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
    setDuplicates([]);
    setDuplicateResolutions({});
  };

  const getMappedFieldLabel = (fieldKey: string) => {
    const field = availableFields.find(f => f.key === fieldKey);
    return field?.label || fieldKey;
  };

  const getImportableRowCount = () => {
    const skipIndices = new Set<number>();
    duplicates.forEach(d => {
      const resolution = duplicateResolutions[d.csvRowIndex];
      if (resolution === 'skip' || resolution === 'existing') {
        skipIndices.add(d.csvRowIndex);
      }
    });
    return rows.length - skipIndices.size;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetAndClose(); else setIsOpen(true); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'upload' && 'Import Contacts from CSV'}
            {step === 'mapping' && (
              <>
                <Sparkles className="w-5 h-5 text-primary" />
                AI Column Mapping
              </>
            )}
            {step === 'duplicates' && (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Resolve Duplicates
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
                  <p className="text-sm text-muted-foreground">Include columns for Name, Title, Email, Phone, LinkedIn</p>
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
                {rows.length} contacts will be checked for duplicates
              </p>
            </div>
          )}

          {/* Step 3: Duplicate Resolution */}
          {step === 'duplicates' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Found {duplicates.length} contacts with duplicate emails. Choose how to handle each.
                </p>
              </div>

              <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">CSV Contact</th>
                      <th className="text-left p-3 font-medium">Existing Contact</th>
                      <th className="text-left p-3 font-medium">Resolution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {duplicates.map((dup) => (
                      <tr key={dup.csvRowIndex} className="hover:bg-muted/30">
                        <td className="p-3">
                          <div className="font-medium">{dup.csvName}</div>
                          <div className="text-xs text-muted-foreground">{dup.csvEmail}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{dup.existingContact.name}</div>
                          <div className="text-xs text-muted-foreground">{dup.existingContact.email}</div>
                        </td>
                        <td className="p-3">
                          <RadioGroup
                            value={duplicateResolutions[dup.csvRowIndex] || 'existing'}
                            onValueChange={(value: DuplicateResolution) => 
                              setDuplicateResolutions(prev => ({ ...prev, [dup.csvRowIndex]: value }))
                            }
                            className="flex flex-col gap-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="existing" id={`existing-${dup.csvRowIndex}`} />
                              <Label htmlFor={`existing-${dup.csvRowIndex}`} className="text-xs">Keep existing</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="csv" id={`csv-${dup.csvRowIndex}`} />
                              <Label htmlFor={`csv-${dup.csvRowIndex}`} className="text-xs">Use CSV (add new)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="skip" id={`skip-${dup.csvRowIndex}`} />
                              <Label htmlFor={`skip-${dup.csvRowIndex}`} className="text-xs">Skip both</Label>
                            </div>
                          </RadioGroup>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-muted-foreground">
                {getImportableRowCount()} contacts will be imported after resolving duplicates
              </p>
            </div>
          )}

          {/* Step 4: Preview */}
          {step === 'preview' && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{getImportableRowCount()} contacts ready to import</p>
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
                    {rows.slice(0, 10).map((row, rowIdx) => {
                      // Check if this row is being skipped
                      const resolution = duplicateResolutions[rowIdx];
                      if (resolution === 'skip' || resolution === 'existing') {
                        return null;
                      }
                      
                      return (
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
                      );
                    })}
                    {getImportableRowCount() > 10 && (
                      <tr>
                        <td colSpan={headers.length} className="p-2 text-center text-muted-foreground">
                          ...and {getImportableRowCount() - 10} more
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
                onClick={() => {
                  if (step === 'preview') setStep(duplicates.length > 0 ? 'duplicates' : 'mapping');
                  else if (step === 'duplicates') setStep('mapping');
                  else setStep('upload');
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
            {step === 'mapping' && (
              <Button onClick={checkForDuplicates} disabled={isCheckingDuplicates}>
                {isCheckingDuplicates && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isCheckingDuplicates ? 'Checking...' : 'Continue'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            {step === 'duplicates' && (
              <Button onClick={() => setStep('preview')}>
                Preview
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            {step === 'preview' && (
              <Button onClick={handleImport} disabled={getImportableRowCount() === 0 || isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import {getImportableRowCount()} Contacts
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
