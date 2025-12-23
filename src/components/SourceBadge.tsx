import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Globe, StickyNote, Table, Pencil } from "lucide-react";

interface ExtractionSource {
  source: string;
  timestamp: string;
  fields: string[];
}

interface SourceBadgeProps {
  extractionSources: ExtractionSource[] | null | undefined;
  fieldName: string;
  className?: string;
}

const sourceConfig: Record<string, { 
  label: string; 
  icon: React.ElementType; 
  className: string;
  description: string;
}> = {
  transcript: {
    label: 'Transcript',
    icon: FileText,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    description: 'Extracted from call transcript'
  },
  notes: {
    label: 'Notes',
    icon: StickyNote,
    className: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
    description: 'Extracted from notes'
  },
  website: {
    label: 'Website',
    icon: Globe,
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
    description: 'Scraped from company website'
  },
  csv: {
    label: 'CSV',
    icon: Table,
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
    description: 'Imported from CSV file'
  },
  manual: {
    label: 'Manual',
    icon: Pencil,
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    description: 'Manually entered'
  },
};

function getFieldSource(
  extractionSources: ExtractionSource[] | null | undefined,
  fieldName: string
): ExtractionSource | null {
  if (!extractionSources || !Array.isArray(extractionSources)) return null;
  
  const sourcesWithField = extractionSources
    .filter(s => s.fields?.includes(fieldName))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return sourcesWithField[0] || null;
}

export function SourceBadge({ extractionSources, fieldName, className = '' }: SourceBadgeProps) {
  const source = getFieldSource(extractionSources, fieldName);
  
  if (!source) return null;
  
  const config = sourceConfig[source.source] || sourceConfig.manual;
  const Icon = config.icon;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`text-xs gap-1 px-1.5 py-0 h-5 ${config.className} ${className}`}
          >
            <Icon className="w-3 h-3" />
            <span className="sr-only md:not-sr-only">{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{config.description}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(source.timestamp).toLocaleDateString()}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function getSourceForField(
  extractionSources: ExtractionSource[] | null | undefined,
  fieldName: string
): string | null {
  const source = getFieldSource(extractionSources, fieldName);
  return source?.source || null;
}
