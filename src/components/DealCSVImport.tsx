import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, Loader2, ArrowRight, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DealCSVImportProps {
  trackerId: string;
  onComplete: () => void;
}

interface AvailableField {
  key: string;
  label: string;
  description: string;
}

type ImportStep = 'upload' | 'mapping' | 'preview';

export function DealCSVImport({ trackerId, onComplete }: DealCSVImportProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [availableFields, setAvailableFields] = useState<AvailableField[]>([]);

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

  const handleImport = async () => {
    setIsLoading(true);

    try {
      const deals = rows.map(row => {
        const deal: Record<string, string> = {};

        headers.forEach((header, index) => {
          const fieldKey = mapping[header];
          if (fieldKey && fieldKey !== 'skip' && row[index]) {
            deal[fieldKey] = row[index];
          }
        });

        return deal;
      }).filter(deal => deal.deal_name); // Only include deals with a name

      if (deals.length === 0) {
        toast.error('No valid deals found. Make sure Company Name is mapped.');
        setIsLoading(false);
        return;
      }

      const dealsToInsert = deals.map(deal => ({
        tracker_id: trackerId,
        deal_name: deal.deal_name,
        company_website: deal.company_website || null,
        transcript_link: deal.transcript_link || null,
        additional_info: deal.additional_info || null,
        // Combine first + last name into contact_name
        contact_name: [deal.contact_first_name, deal.contact_last_name]
          .filter(Boolean).join(' ') || null,
        contact_title: deal.contact_title || null,
        contact_email: deal.contact_email || null,
        contact_phone: deal.contact_phone || null,
        status: 'Active',
      }));

      const { error } = await supabase.from('deals').insert(dealsToInsert);

      if (error) throw error;

      toast.success(`Successfully imported ${dealsToInsert.length} deals`);
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
  };

  const previewDeals = rows.slice(0, 5).map(row => {
    const deal: Record<string, string> = {};
    headers.forEach((header, index) => {
      const fieldKey = mapping[header];
      if (fieldKey && fieldKey !== 'skip' && row[index]) {
        deal[fieldKey] = row[index];
      }
    });
    return deal;
  }).filter(deal => deal.deal_name);

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
        <div className="flex items-center gap-2 mb-4">
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${step === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            1. Upload
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${step === 'mapping' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            2. Map Columns
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${step === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            3. Preview & Import
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
                  CSV files supported. We'll map: Company Name, Website, Fireflies Link, Notes, and Owner contact info.
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
              <Button onClick={() => setStep('preview')}>
                Preview Deals
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
              Total deals to import: <span className="font-medium">{rows.filter(row => {
                const nameIndex = headers.findIndex(h => mapping[h] === 'deal_name');
                return nameIndex >= 0 && row[nameIndex];
              }).length}</span>
            </p>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>
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
