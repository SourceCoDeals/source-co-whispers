import { ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DataFieldProps {
  label: string;
  value?: string | number | null;
  type?: "text" | "currency" | "percentage" | "url" | "list";
  className?: string;
}

export function DataField({ label, value, type = "text", className }: DataFieldProps) {
  if (value === null || value === undefined || value === "") return null;
  
  let displayValue: ReactNode = value;
  
  if (type === "currency" && typeof value === "number") {
    displayValue = `$${value.toLocaleString()}M`;
  } else if (type === "percentage" && typeof value === "number") {
    displayValue = `${value}%`;
  } else if (type === "url" && typeof value === "string") {
    displayValue = (
      <a 
        href={value.startsWith("http") ? value : `https://${value}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {value.replace(/^https?:\/\//, "").replace(/\/$/, "")}
      </a>
    );
  }
  
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium">{displayValue}</p>
    </div>
  );
}

interface DataListFieldProps {
  label: string;
  items?: string[] | null;
  variant?: "default" | "destructive" | "outline";
  className?: string;
  collapsible?: boolean;
  collapsedCount?: number;
}

export function DataListField({ 
  label, 
  items, 
  variant = "outline", 
  className,
  collapsible = false,
  collapsedCount = 5
}: DataListFieldProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!items || items.length === 0) return null;
  
  const shouldCollapse = collapsible && items.length > collapsedCount;
  const displayItems = shouldCollapse && !isExpanded 
    ? items.slice(0, collapsedCount) 
    : items;
  const hiddenCount = items.length - collapsedCount;
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        {shouldCollapse && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <>
                <span>Show less</span>
                <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                <span>+{hiddenCount} more</span>
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {displayItems.map((item, i) => (
          <Badge key={i} variant={variant} className="text-xs">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

interface BuyerDataSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
  actions?: ReactNode;
}

export function BuyerDataSection({ 
  title, 
  icon, 
  children, 
  className,
  emptyMessage = "No data available",
  isEmpty = false,
  actions
}: BuyerDataSectionProps) {
  return (
    <div className={cn("bg-card rounded-lg border", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        {actions}
      </div>
      <div className="p-4">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

interface DataGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function DataGrid({ children, columns = 3, className }: DataGridProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };
  
  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}
