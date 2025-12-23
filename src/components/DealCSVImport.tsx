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
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(line => parseCSVLine(line));
    return { headers, rows };
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
      const dealsToUpdate: { id: string; data: Record<string, any> }[] = [];

      rows.forEach((row, rowIndex) => {
        const deal: Record<string, string> = {};

        headers.forEach((header, colIndex) => {
          const fieldKey = mapping[header];
          if (fieldKey && fieldKey !== 'skip' && row[colIndex]) {
            deal[fieldKey] = row[colIndex];
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
            // Prepare update for existing deal
            const updateData: Record<string, any> = {};
            
            if (deal.company_website) updateData.company_website = deal.company_website;
            if (deal.transcript_link) updateData.transcript_link = deal.transcript_link;
            if (deal.additional_info) updateData.additional_info = deal.additional_info;
            
            const contactName = [deal.contact_first_name, deal.contact_last_name]
              .filter(Boolean).join(' ');
            if (contactName) updateData.contact_name = contactName;
            if (deal.contact_title) updateData.contact_title = deal.contact_title;
            if (deal.contact_email) updateData.contact_email = deal.contact_email;
            if (deal.contact_phone) updateData.contact_phone = deal.contact_phone;

            if (Object.keys(updateData).length > 0) {
              dealsToUpdate.push({ id: dupInfo.existingDealId, data: updateData });
            }
            return;
          }
          // action === 'create' falls through to insert
        }

        // Create new deal
        dealsToInsert.push({
          tracker_id: trackerId,
          deal_name: deal.deal_name,
          company_website: deal.company_website || null,
          transcript_link: deal.transcript_link || null,
          additional_info: deal.additional_info || null,
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
      if (dealsToInsert.length === 0 && dealsToUpdate.length === 0) {
        toast.error('No deals to import after applying duplicate rules.');
        setIsLoading(false);
        return;
      }

      // Insert new deals
      if (dealsToInsert.length > 0) {
        const { error: insertError } = await supabase.from('deals').insert(dealsToInsert);
        if (insertError) throw insertError;
      }

      // Update merged deals
      for (const { id, data } of dealsToUpdate) {
        // Add csv source tracking for merged fields
        const { data: existingDeal } = await supabase
          .from('deals')
          .select('extraction_sources')
          .eq('id', id)
          .single();
        
        const existingSources = (existingDeal?.extraction_sources as any[]) || [];
        const newSource = {
          source: 'csv',
          timestamp: new Date().toISOString(),
          fields: Object.keys(data),
        };
        
        const { error: updateError } = await supabase
          .from('deals')
          .update({ 
            ...data, 
            extraction_sources: [...existingSources, newSource],
            updated_at: new Date().toISOString() 
          })
          .eq('id', id);
        
        if (updateError) throw updateError;
      }

      const totalProcessed = dealsToInsert.length + dealsToUpdate.length;
      toast.success(`Successfully processed ${totalProcessed} deals (${dealsToInsert.length} new, ${dealsToUpdate.length} merged)`);
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
