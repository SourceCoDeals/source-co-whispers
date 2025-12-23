import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Check, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ExtractedData {
  deal_name?: string;
  company_website?: string;
  geography?: string[];
  revenue?: number;
  ebitda_percentage?: number;
  ebitda_amount?: number;
  owner_goals?: string;
  service_mix?: string;
  business_model?: string;
  employee_count?: number;
  location_count?: number;
  ownership_structure?: string;
  additional_info?: string;
}

interface DealNotesSectionProps {
  dealId: string;
  existingExtractionSources?: Record<string, { source: string; extractedAt: string }>;
  onNotesApplied: () => void;
}

export function DealNotesSection({ dealId, existingExtractionSources, onNotesApplied }: DealNotesSectionProps) {
  const [notes, setNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [fieldsExtracted, setFieldsExtracted] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  const analyzeNotes = async () => {
    if (!notes.trim()) {
      toast.error('Please enter some notes to analyze');
      return;
    }

    setIsAnalyzing(true);
    setExtractedData(null);
    setFieldsExtracted([]);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-deal-notes', {
        body: { notes }
      });

      if (error) throw error;

      if (data?.extractedData) {
        setExtractedData(data.extractedData);
        setFieldsExtracted(data.fieldsExtracted || []);
        toast.success(`Extracted ${data.fieldsExtracted?.length || 0} fields from notes`);
      } else {
        toast.info('No structured data could be extracted from the notes');
      }
    } catch (error) {
      console.error('Error analyzing notes:', error);
      toast.error('Failed to analyze notes');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyToNote = async () => {
    if (!extractedData) return;

    setIsApplying(true);

    try {
      // Determine which fields to update based on priority
      // Transcripts have highest priority, notes come next, website lowest
      const protectedFields = new Set<string>();
      
      if (existingExtractionSources) {
        Object.entries(existingExtractionSources).forEach(([field, info]) => {
          if (info.source === 'transcript') {
            protectedFields.add(field);
          }
        });
      }

      // Build update object, skipping protected fields
      const updateData: Record<string, unknown> = {};
      const newSources: Record<string, { source: string; extractedAt: string }> = {
        ...(existingExtractionSources || {})
      };
      const updatedFields: string[] = [];

      const fieldMappings: Record<string, keyof ExtractedData> = {
        company_website: 'company_website',
        geography: 'geography',
        revenue: 'revenue',
        ebitda_percentage: 'ebitda_percentage',
        ebitda_amount: 'ebitda_amount',
        owner_goals: 'owner_goals',
        service_mix: 'service_mix',
        business_model: 'business_model',
        employee_count: 'employee_count',
        location_count: 'location_count',
        ownership_structure: 'ownership_structure',
      };

      Object.entries(fieldMappings).forEach(([dbField, extractedField]) => {
        const value = extractedData[extractedField];
        if (value !== undefined && value !== null && !protectedFields.has(dbField)) {
          updateData[dbField] = value;
          newSources[dbField] = { source: 'notes', extractedAt: new Date().toISOString() };
          updatedFields.push(dbField);
        }
      });

      // Handle additional_info separately - append to existing
      if (extractedData.additional_info) {
        const { data: currentDeal } = await supabase
          .from('deals')
          .select('additional_info')
          .eq('id', dealId)
          .single();

        const existingInfo = currentDeal?.additional_info || '';
        const newInfo = extractedData.additional_info;
        
        if (existingInfo) {
          updateData.additional_info = `${existingInfo}\n\n--- From Notes (${new Date().toLocaleDateString()}) ---\n${newInfo}`;
        } else {
          updateData.additional_info = newInfo;
        }
        updatedFields.push('additional_info');
      }

      if (Object.keys(updateData).length === 0) {
        toast.info('No new fields to update (existing data has higher priority)');
        return;
      }

      // Update the deal
      updateData.extraction_sources = newSources;
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId);

      if (error) throw error;

      const skippedCount = fieldsExtracted.length - updatedFields.length;
      let message = `Updated ${updatedFields.length} fields`;
      if (skippedCount > 0) {
        message += ` (${skippedCount} skipped - transcript data has priority)`;
      }
      
      toast.success(message);
      setNotes('');
      setExtractedData(null);
      setFieldsExtracted([]);
      onNotesApplied();
    } catch (error) {
      console.error('Error applying notes:', error);
      toast.error('Failed to apply notes to deal');
    } finally {
      setIsApplying(false);
    }
  };

  const formatFieldName = (field: string) => {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatValue = (value: unknown): string => {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'number') {
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
      return value.toString();
    }
    return String(value);
  };

  const isFieldProtected = (field: string): boolean => {
    return existingExtractionSources?.[field]?.source === 'transcript';
  };

  return (
    <Card className="border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              General Notes
            </CardTitle>
            {isOpen ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Paste general notes here... The AI will extract relevant deal information and put the remainder in Additional Information."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[150px] resize-y"
              />
              <Button
                onClick={analyzeNotes}
                disabled={isAnalyzing || !notes.trim()}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Notes...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze Notes
                  </>
                )}
              </Button>
            </div>

            {extractedData && fieldsExtracted.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Extracted Information Preview
                </h4>
                <div className="grid gap-2">
                  {fieldsExtracted.map((field) => {
                    const value = extractedData[field as keyof ExtractedData];
                    if (value === undefined || value === null) return null;
                    
                    const isProtected = isFieldProtected(field);
                    
                    return (
                      <div
                        key={field}
                        className={`flex items-center justify-between p-2 rounded-md text-sm ${
                          isProtected 
                            ? 'bg-muted/30 text-muted-foreground' 
                            : 'bg-primary/10'
                        }`}
                      >
                        <span className="font-medium">{formatFieldName(field)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-right max-w-[200px] truncate">
                            {formatValue(value)}
                          </span>
                          {isProtected ? (
                            <Badge variant="outline" className="text-xs">
                              Transcript priority
                            </Badge>
                          ) : (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <Button
                  onClick={applyToNote}
                  disabled={isApplying}
                  variant="default"
                  className="w-full"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Apply to Deal
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
