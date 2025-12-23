import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, Loader2, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizeDomain } from '@/lib/normalizeDomain';

interface DealCSVImportProps {
  trackerId: string;
  onComplete: () => void;
}

interface AvailableField {
  key: string;
  label: string;
  description: string;
}

interface DuplicateInfo {
  rowIndex: number;
  existingDealId: string;
  existingDealName: string;
  domain: string;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'duplicates';

export function DealCSVImport({ trackerId, onComplete }: DealCSVImportProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [availableFields, setAvailableFields] = useState<AvailableField[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [duplicateActions, setDuplicateActions] = useState<Record<number, 'skip' | 'merge' | 'create'>>({});

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    // Proper CSV parser that handles multi-line content inside quoted cells
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote ("") inside a quoted field
          currentCell += '"';
          i++; // Skip the next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of cell
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
        // End of row (only when not inside quotes)
        if (char === '\r') i++; // Skip \n in \r\n
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else if (char === '\r' && !inQuotes) {
        // Handle standalone \r as row separator
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    
    // Don't forget the last cell/row
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell !== '')) {
        rows.push(currentRow);
      }
    }
    
    if (rows.length === 0) return { headers: [], rows: [] };
    
    const headers = rows[0];
    const dataRows = rows.slice(1);
    return { headers, rows: dataRows };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);

    try {
      const text = await file.text();
      const { headers: csvHeaders, rows: csvRows } = parseCSV(text);

      if (csvHeaders.length === 0) {
        toast.error('Could not parse CSV file');
        return;
      }

      setHeaders(csvHeaders);
      setRows(csvRows);

      // Call AI to suggest mappings
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/map-deal-csv-columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token}`,
        },
        body: JSON.stringify({
          headers: csvHeaders,
          sampleRows: csvRows.slice(0, 5),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze columns');
      }

      const result = await response.json();
      setMapping(result.mapping || {});
      setAvailableFields(result.availableFields || []);
      setStep('mapping');
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file');
    } finally {
      setIsLoading(false);
    }
  };

  const updateMapping = (header: string, fieldKey: string) => {
    setMapping(prev => ({ ...prev, [header]: fieldKey }));
  };

  const getMappedFieldLabel = (fieldKey: string): string => {
    const field = availableFields.find(f => f.key === fieldKey);
    return field?.label || fieldKey;
  };

  const checkForDuplicates = async () => {
    setIsLoading(true);
    
    try {
      // Get website column index
      const websiteColIndex = headers.findIndex(h => mapping[h] === 'company_website');
      if (websiteColIndex === -1) {
        // No website column mapped, skip deduplication
        setStep('preview');
        return;
      }

      // Extract domains from CSV
      const csvDomains: { rowIndex: number; domain: string }[] = [];
      rows.forEach((row, idx) => {
        const website = row[websiteColIndex];
        if (website) {
          const domain = normalizeDomain(website);
          if (domain) {
            csvDomains.push({ rowIndex: idx, domain });
          }
        }
      });

      if (csvDomains.length === 0) {
        setStep('preview');
        return;
      }

      // Fetch existing deals in this tracker
      const { data: existingDeals, error } = await supabase
        .from('deals')
        .select('id, deal_name, company_website')
        .eq('tracker_id', trackerId);

      if (error) throw error;

      // Build domain map of existing deals
      const existingDomainMap = new Map<string, { id: string; name: string }>();
      (existingDeals || []).forEach(deal => {
        if (deal.company_website) {
          const domain = normalizeDomain(deal.company_website);
          if (domain) {
            existingDomainMap.set(domain, { id: deal.id, name: deal.deal_name });
          }
        }
      });

      // Find duplicates
      const foundDuplicates: DuplicateInfo[] = [];
      csvDomains.forEach(({ rowIndex, domain }) => {
        const existing = existingDomainMap.get(domain);
        if (existing) {
          foundDuplicates.push({
            rowIndex,
            existingDealId: existing.id,
            existingDealName: existing.name,
            domain,
          });
        }
      });

      if (foundDuplicates.length > 0) {
        setDuplicates(foundDuplicates);
        // Default action: skip duplicates
        const defaultActions: Record<number, 'skip' | 'merge' | 'create'> = {};
        foundDuplicates.forEach(d => {
          defaultActions[d.rowIndex] = 'skip';
        });
        setDuplicateActions(defaultActions);
        setStep('duplicates');
      } else {
        setStep('preview');
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
      toast.error('Failed to check for duplicates');
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    setIsLoading(true);

    try {
      const duplicateRowIndices = new Set(duplicates.map(d => d.rowIndex));
      const dealsToInsert: any[] = [];
      const dealsToMerge: { id: string; csvData: Record<string, string> }[] = [];

      rows.forEach((row, rowIndex) => {
        const deal: Record<string, string> = {};

        headers.forEach((header, colIndex) => {
          const fieldKey = mapping[header];
          if (fieldKey && fieldKey !== 'skip' && row[colIndex]) {
            // Concatenate multiple columns mapped to additional_info instead of overwriting
            if (fieldKey === 'additional_info' && deal[fieldKey]) {
              deal[fieldKey] = deal[fieldKey] + '\n\n---\n\n' + row[colIndex];
            } else {
              deal[fieldKey] = row[colIndex];
            }
          }
        });

        // Skip rows without a name
        if (!deal.deal_name) return;

        // Handle duplicates
        if (duplicateRowIndices.has(rowIndex)) {
          const action = duplicateActions[rowIndex];
          const dupInfo = duplicates.find(d => d.rowIndex === rowIndex);
          
          if (action === 'skip') {
            return; // Skip this row
          } else if (action === 'merge' && dupInfo) {
            // Prepare for merge with priority checking
            dealsToMerge.push({ 
              id: dupInfo.existingDealId, 
              csvData: deal
            });
            return;
          }
          // action === 'create' falls through to insert
        }

        // Create new deal
        dealsToInsert.push({
          tracker_id: trackerId,
          deal_name: deal.deal_name,
          company_website: deal.company_website || null,
          company_overview: deal.company_overview || null,
          transcript_link: deal.transcript_link || null,
          additional_info: deal.additional_info || null,
          company_address: deal.company_address || null,
          contact_name: [deal.contact_first_name, deal.contact_last_name]
            .filter(Boolean).join(' ') || null,
          contact_title: deal.contact_title || null,
          contact_email: deal.contact_email || null,
          contact_phone: deal.contact_phone || null,
          status: 'Active',
          extraction_sources: [
            {
              source: 'csv',
              timestamp: new Date().toISOString(),
              fields: Object.keys(deal).filter(k => k !== 'contact_first_name' && k !== 'contact_last_name'),
            }
          ],
        });
      });

      // Validate we have something to import
      if (dealsToInsert.length === 0 && dealsToMerge.length === 0) {
        toast.error('No deals to import after applying duplicate rules.');
        setIsLoading(false);
        return;
      }

      // Insert new deals and get their IDs
      let insertedDeals: { id: string; additional_info: string | null }[] = [];
      if (dealsToInsert.length > 0) {
        const { error: insertError, data: insertedData } = await supabase
          .from('deals')
          .insert(dealsToInsert)
          .select('id, additional_info');
        
        if (insertError) throw insertError;
        insertedDeals = insertedData || [];
      }

      // Merge deals with source priority checking
      // CSV priority = 40, so it should NOT overwrite transcript (100) or notes (80)
      const SOURCE_PRIORITY: Record<string, number> = {
        transcript: 100,
        notes: 80,
        website: 60,
        csv: 40,
        manual: 20,
      };
      
      const mergedDealsInfo: { id: string; additional_info: string | null }[] = [];
      
      for (const { id, csvData } of dealsToMerge) {
        // Fetch existing deal's extraction_sources
        const { data: existingDeal } = await supabase
          .from('deals')
          .select('extraction_sources, additional_info')
          .eq('id', id)
          .single();
        
        const existingSources = (existingDeal?.extraction_sources as any[]) || [];
        
        // Helper to check if a field is protected by higher-priority source
        const isFieldProtected = (fieldName: string): boolean => {
          const sourcesWithField = existingSources.filter((s: any) => s.fields?.includes(fieldName));
          if (sourcesWithField.length === 0) return false;
          
          // Get highest priority source for this field
          const maxPriority = Math.max(...sourcesWithField.map((s: any) => SOURCE_PRIORITY[s.source] || 0));
          return maxPriority > SOURCE_PRIORITY.csv;
        };
        
        // Build update data, respecting priority
        const updateData: Record<string, any> = {};
        const updatedFields: string[] = [];
        
        // Map CSV fields to deal fields
        const fieldMappings: Record<string, string> = {
          company_website: 'company_website',
          transcript_link: 'transcript_link',
          additional_info: 'additional_info',
          contact_title: 'contact_title',
          contact_email: 'contact_email',
          contact_phone: 'contact_phone',
          company_overview: 'company_overview',
          company_address: 'company_address',
        };
        
        for (const [csvField, dealField] of Object.entries(fieldMappings)) {
          if (csvData[csvField] && !isFieldProtected(dealField)) {
            updateData[dealField] = csvData[csvField];
            updatedFields.push(dealField);
          }
        }
        
        // Handle contact_name separately (combined from first/last)
        const contactName = [csvData.contact_first_name, csvData.contact_last_name]
          .filter(Boolean).join(' ');
        if (contactName && !isFieldProtected('contact_name')) {
          updateData.contact_name = contactName;
          updatedFields.push('contact_name');
        }
        
        if (Object.keys(updateData).length > 0) {
          const newSource = {
            source: 'csv',
            timestamp: new Date().toISOString(),
            fields: updatedFields,
          };
          
          const { error: updateError } = await supabase
            .from('deals')
            .update({ 
              ...updateData, 
              extraction_sources: [...existingSources, newSource],
              updated_at: new Date().toISOString() 
            })
            .eq('id', id);
          
          if (updateError) throw updateError;
          
          // Track for notes analysis
          if (updateData.additional_info) {
            mergedDealsInfo.push({ id, additional_info: updateData.additional_info });
          }
        }
      }

      // Analyze notes for all deals that have additional_info (both new inserts AND merged deals)
      const allDealsWithNotes: { id: string; additional_info: string }[] = [
        ...insertedDeals.filter(d => d.additional_info && d.additional_info.trim().length > 10)
          .map(d => ({ id: d.id, additional_info: d.additional_info! })),
        ...mergedDealsInfo.filter(d => d.additional_info && d.additional_info.trim().length > 10)
          .map(d => ({ id: d.id, additional_info: d.additional_info! }))
      ];
      
      if (allDealsWithNotes.length > 0) {
        toast.info(`Analyzing ${allDealsWithNotes.length} deal notes for structured data...`);
        
        // Process notes analysis in parallel (batch of 5 at a time to avoid overwhelming)
        const { data: session } = await supabase.auth.getSession();
        const batchSize = 5;
        
        for (let i = 0; i < allDealsWithNotes.length; i += batchSize) {
          const batch = allDealsWithNotes.slice(i, i + batchSize);
          
          await Promise.all(batch.map(async (deal) => {
            try {
              const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-deal-notes`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.session?.access_token}`,
                },
                body: JSON.stringify({
                  dealId: deal.id,
                  notes: deal.additional_info,
                  applyToRecord: true, // Tell the function to apply extracted data
                }),
              });
              
              if (!response.ok) {
                console.error(`Failed to analyze notes for deal ${deal.id}:`, await response.text());
              } else {
                const result = await response.json();
                console.log(`Notes analyzed for deal ${deal.id}:`, result.fieldsExtracted);
              }
            } catch (err) {
              console.error(`Error analyzing notes for deal ${deal.id}:`, err);
            }
          }));
        }
        
        toast.success(`Notes analysis complete`);
      }

      // Score all imported/updated deals
      const allDealIds = [
        ...insertedDeals.map(d => d.id),
        ...dealsToMerge.map(m => m.id)
      ];
      
      if (allDealIds.length > 0) {
        toast.info(`Scoring ${allDealIds.length} deals...`);
        const scoreBatchSize = 5;
        
        for (let i = 0; i < allDealIds.length; i += scoreBatchSize) {
          const batch = allDealIds.slice(i, i + scoreBatchSize);
          await Promise.all(batch.map(async (dealId) => {
            try {
              await supabase.functions.invoke('score-deal', { body: { dealId } });
            } catch (err) {
              console.error(`Error scoring deal ${dealId}:`, err);
            }
          }));
        }
        
        toast.success(`Deal scoring complete`);
      }

      const totalProcessed = dealsToInsert.length + dealsToMerge.length;
      toast.success(`Successfully processed ${totalProcessed} deals (${dealsToInsert.length} new, ${dealsToMerge.length} merged)`);
      resetAndClose();
      onComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import deals');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setOpen(false);
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setAvailableFields([]);
    setDuplicates([]);
    setDuplicateActions({});
  };

  const previewDeals = rows.slice(0, 5).map((row, rowIndex) => {
    const deal: Record<string, string> = {};
    headers.forEach((header, index) => {
      const fieldKey = mapping[header];
      if (fieldKey && fieldKey !== 'skip' && row[index]) {
        deal[fieldKey] = row[index];
      }
    });
    deal._rowIndex = String(rowIndex);
    return deal;
  }).filter(deal => deal.deal_name);

  const duplicateRowSet = new Set(duplicates.map(d => d.rowIndex));
  const skippedCount = duplicates.filter(d => duplicateActions[d.rowIndex] === 'skip').length;
  const mergeCount = duplicates.filter(d => duplicateActions[d.rowIndex] === 'merge').length;
  const createCount = duplicates.filter(d => duplicateActions[d.rowIndex] === 'create').length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import Deals
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Deals from Spreadsheet
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${step === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            1. Upload
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${step === 'mapping' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            2. Map Columns
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${step === 'duplicates' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            3. Duplicates
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${step === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            4. Import
          </div>
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Analyzing columns with AI...</p>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Upload your spreadsheet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  CSV files supported. We'll detect duplicates by website domain.
                </p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button variant="outline" asChild>
                    <span>Choose File</span>
                  </Button>
                </label>
              </>
            )}
          </div>
        )}

        {/* Mapping Step */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              File: <span className="font-medium">{fileName}</span> • {rows.length} rows found
            </p>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CSV Column</TableHead>
                  <TableHead>Sample Value</TableHead>
                  <TableHead>Map To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {headers.map((header, index) => (
                  <TableRow key={header}>
                    <TableCell className="font-medium">{header}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[200px]">
                      {rows[0]?.[index] || '-'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping[header] || 'skip'}
                        onValueChange={(value) => updateMapping(header, value)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map((field) => (
                            <SelectItem key={field.key} value={field.key}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={checkForDuplicates} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Check for Duplicates
              </Button>
            </div>
          </div>
        )}

        {/* Duplicates Step */}
        {step === 'duplicates' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <p className="text-sm">
                Found <span className="font-medium">{duplicates.length}</span> potential duplicate(s) based on website domain.
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CSV Company</TableHead>
                  <TableHead>Existing Deal</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duplicates.map((dup) => {
                  const nameColIndex = headers.findIndex(h => mapping[h] === 'deal_name');
                  const csvName = rows[dup.rowIndex]?.[nameColIndex] || 'Unknown';
                  
                  return (
                    <TableRow key={dup.rowIndex}>
                      <TableCell className="font-medium">{csvName}</TableCell>
                      <TableCell className="text-muted-foreground">{dup.existingDealName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{dup.domain}</TableCell>
                      <TableCell>
                        <Select
                          value={duplicateActions[dup.rowIndex] || 'skip'}
                          onValueChange={(value: 'skip' | 'merge' | 'create') => 
                            setDuplicateActions(prev => ({ ...prev, [dup.rowIndex]: value }))
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip">Skip</SelectItem>
                            <SelectItem value="merge">Merge into existing</SelectItem>
                            <SelectItem value="create">Create new</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="text-sm text-muted-foreground">
              Summary: {skippedCount} skip, {mergeCount} merge, {createCount} create new
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button onClick={() => setStep('preview')}>
                Continue to Preview
              </Button>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Preview of first 5 deals to be imported:
            </p>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Owner Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewDeals.map((deal, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{deal.deal_name || '-'}</TableCell>
                    <TableCell className="truncate max-w-[120px]">{deal.company_website || '-'}</TableCell>
                    <TableCell className="truncate max-w-[120px]">
                      {[deal.contact_first_name, deal.contact_last_name].filter(Boolean).join(' ') || '-'}
                    </TableCell>
                    <TableCell className="truncate max-w-[100px]">{deal.contact_title || '-'}</TableCell>
                    <TableCell className="truncate max-w-[150px]">{deal.contact_email || '-'}</TableCell>
                    <TableCell className="truncate max-w-[100px]">{deal.contact_phone || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <p className="text-sm text-muted-foreground">
              Total deals to import: <span className="font-medium">{rows.filter((row, idx) => {
                const nameIndex = headers.findIndex(h => mapping[h] === 'deal_name');
                if (nameIndex < 0 || !row[nameIndex]) return false;
                // Exclude skipped duplicates
                if (duplicateRowSet.has(idx) && duplicateActions[idx] === 'skip') return false;
                return true;
              }).length}</span>
              {duplicates.length > 0 && (
                <span className="ml-2">
                  ({skippedCount} skipped, {mergeCount} merged)
                </span>
              )}
            </p>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => duplicates.length > 0 ? setStep('duplicates') : setStep('mapping')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Import Deals
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
