# Component Architecture

## Overview

SourceCo uses a feature-based component architecture, organizing code by domain rather than by file type. This document describes the component structure and patterns.

---

## Directory Structure

```
src/
├── components/                 # Shared, reusable components
│   ├── ui/                    # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── layout/                # Layout components
│   │   └── AppLayout.tsx
│   ├── tracker/               # Tracker-specific components
│   │   ├── TrackerBuyersTab.tsx
│   │   ├── TrackerBuyersTable.tsx
│   │   ├── TrackerBuyersToolbar.tsx
│   │   ├── TrackerDealsTab.tsx
│   │   ├── TrackerDealsTable.tsx
│   │   ├── AddBuyerDialog.tsx
│   │   ├── DedupeDialog.tsx
│   │   └── index.ts
│   ├── dashboard/             # Dashboard widgets
│   │   ├── PipelineFunnel.tsx
│   │   ├── ConversionMetrics.tsx
│   │   ├── DealActivityChart.tsx
│   │   ├── ScoreDistribution.tsx
│   │   └── Sparkline.tsx
│   ├── skeletons/             # Loading states
│   │   ├── DealDetailSkeleton.tsx
│   │   ├── DealListSkeleton.tsx
│   │   └── TrackerDetailSkeleton.tsx
│   └── [domain-components]/   # Other shared domain components
│       ├── BuyerCard.tsx
│       ├── BuyerQueryChat.tsx
│       ├── ScoreTierBadge.tsx
│       ├── ConfidenceBadge.tsx
│       └── ...
├── features/                  # Feature modules
│   ├── trackers/
│   │   ├── components/
│   │   │   ├── TrackerHeader.tsx
│   │   │   ├── TrackerCriteriaSection.tsx
│   │   │   ├── TrackerTabsContainer.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useTrackerState.ts
│   │   │   └── useTrackerActions.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── buyers/
│   │   ├── components/
│   │   │   ├── BuyerHeader.tsx
│   │   │   ├── BuyerContactsTab.tsx
│   │   │   ├── BuyerDealHistoryTab.tsx
│   │   │   ├── BuyerTranscriptsSection.tsx
│   │   │   └── index.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── deals/
│   │   ├── types.ts
│   │   └── index.ts
│   └── matching/
│       ├── types.ts
│       └── index.ts
├── hooks/                     # Shared hooks
│   ├── queries/               # TanStack Query hooks
│   │   ├── queryKeys.ts
│   │   └── index.ts
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   ├── useBulkEnrichment.ts
│   └── ...
├── lib/                       # Utilities and constants
│   ├── types.ts               # Core TypeScript interfaces
│   ├── criteriaSchema.ts      # Criteria type definitions
│   ├── utils.ts               # Utility functions
│   └── ...
└── pages/                     # Route components
    ├── Index.tsx              # Dashboard
    ├── TrackerDetail.tsx
    ├── DealMatching.tsx
    ├── BuyerDetail.tsx
    ├── DealDetail.tsx
    └── ...
```

---

## Component Categories

### 1. Page Components (`src/pages/`)

Top-level route components that orchestrate feature components.

**Characteristics:**
- Correspond to routes
- Manage page-level state
- Compose feature components
- Handle data fetching at page level

**Example Structure:**
```typescript
// src/pages/TrackerDetail.tsx
export default function TrackerDetail() {
  const { id } = useParams();
  
  // Page-level data fetching
  const { data: tracker, isLoading } = useQuery({
    queryKey: ["tracker", id],
    queryFn: () => fetchTracker(id)
  });
  
  // Page-level state
  const [activeTab, setActiveTab] = useState("buyers");
  
  if (isLoading) return <TrackerDetailSkeleton />;
  
  return (
    <AppLayout>
      <TrackerHeader tracker={tracker} />
      <TrackerCriteriaSection tracker={tracker} />
      <TrackerTabsContainer 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tracker={tracker}
      />
    </AppLayout>
  );
}
```

### 2. Feature Components (`src/features/`)

Domain-specific components grouped by feature.

**Characteristics:**
- Encapsulated domain logic
- Can have local hooks and types
- Export through barrel files
- May compose shared components

**Example Structure:**
```typescript
// src/features/buyers/components/BuyerHeader.tsx
export function BuyerHeader({ 
  buyer, 
  onEdit, 
  onEnrich 
}: BuyerHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">{buyer.pe_firm_name}</h1>
        {buyer.platform_company_name && (
          <p className="text-muted-foreground">{buyer.platform_company_name}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
        <Button onClick={onEnrich}>
          <Wand2 className="w-4 h-4 mr-2" />
          Enrich
        </Button>
      </div>
    </div>
  );
}
```

### 3. Shared Components (`src/components/`)

Reusable components used across features.

**Categories:**

#### UI Components (`src/components/ui/`)
Base shadcn/ui components. Do not modify directly.

```typescript
// Usage
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
```

#### Layout Components (`src/components/layout/`)
Page layout structures.

```typescript
// src/components/layout/AppLayout.tsx
export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/trackers">Trackers</NavLink>
      </nav>
      <main className="container py-6">
        {children}
      </main>
    </div>
  );
}
```

#### Domain Components (`src/components/tracker/`, etc.)
Reusable domain-specific components.

```typescript
// src/components/tracker/TrackerBuyersTable.tsx
export function TrackerBuyersTable({
  buyers,
  selectedIds,
  onSelect,
  onEnrich,
  onDelete,
  sortColumn,
  sortDirection,
  onSort
}: TrackerBuyersTableProps) {
  return (
    <Table>
      <TableHeader>
        <SortableHeader 
          column="pe_firm_name" 
          current={sortColumn} 
          direction={sortDirection}
          onSort={onSort}
        >
          PE Firm
        </SortableHeader>
        {/* ... */}
      </TableHeader>
      <TableBody>
        {buyers.map(buyer => (
          <BuyerRow 
            key={buyer.id} 
            buyer={buyer}
            selected={selectedIds.includes(buyer.id)}
            onSelect={onSelect}
            onEnrich={onEnrich}
            onDelete={onDelete}
          />
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## Component Patterns

### 1. Compound Components

For complex UI with related parts:

```typescript
// Usage
<Tabs defaultValue="buyers">
  <TabsList>
    <TabsTrigger value="buyers">Buyers</TabsTrigger>
    <TabsTrigger value="deals">Deals</TabsTrigger>
  </TabsList>
  <TabsContent value="buyers">
    <TrackerBuyersTab />
  </TabsContent>
  <TabsContent value="deals">
    <TrackerDealsTab />
  </TabsContent>
</Tabs>
```

### 2. Render Props

For flexible rendering:

```typescript
interface DataListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyState?: React.ReactNode;
}

function DataList<T>({ items, renderItem, emptyState }: DataListProps<T>) {
  if (items.length === 0) {
    return emptyState || <p>No items found</p>;
  }
  
  return <div>{items.map(renderItem)}</div>;
}

// Usage
<DataList
  items={buyers}
  renderItem={(buyer) => <BuyerCard key={buyer.id} buyer={buyer} />}
  emptyState={<EmptyBuyerState />}
/>
```

### 3. Controlled vs Uncontrolled

Support both patterns:

```typescript
interface DialogProps {
  // Controlled
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  
  // Uncontrolled
  defaultOpen?: boolean;
  
  // Common
  trigger?: React.ReactNode;
  children: React.ReactNode;
}
```

### 4. Composition over Props

Prefer children for flexibility:

```typescript
// ❌ Avoid prop drilling
<Card
  title="Buyer Details"
  subtitle="PE Firm: ABC Capital"
  content={<BuyerInfo />}
  footer={<ActionButtons />}
/>

// ✅ Prefer composition
<Card>
  <CardHeader>
    <CardTitle>Buyer Details</CardTitle>
    <CardDescription>PE Firm: ABC Capital</CardDescription>
  </CardHeader>
  <CardContent>
    <BuyerInfo />
  </CardContent>
  <CardFooter>
    <ActionButtons />
  </CardFooter>
</Card>
```

---

## State Management Patterns

### 1. Local State

For UI-only state:

```typescript
function BuyerFilters() {
  const [search, setSearch] = useState("");
  const [showEnrichedOnly, setShowEnrichedOnly] = useState(false);
  
  return (
    <div className="flex gap-4">
      <Input 
        value={search} 
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search buyers..."
      />
      <Switch 
        checked={showEnrichedOnly}
        onCheckedChange={setShowEnrichedOnly}
      />
    </div>
  );
}
```

### 2. Lifted State

When siblings need shared state:

```typescript
function TrackerBuyersTab() {
  // Lifted state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  
  return (
    <div>
      <TrackerBuyersToolbar
        search={search}
        onSearchChange={setSearch}
        selectedCount={selectedIds.length}
        onDeleteSelected={() => handleBulkDelete(selectedIds)}
      />
      <TrackerBuyersTable
        buyers={filteredBuyers}
        selectedIds={selectedIds}
        onSelect={(id) => setSelectedIds(prev => 
          prev.includes(id) 
            ? prev.filter(x => x !== id)
            : [...prev, id]
        )}
      />
    </div>
  );
}
```

### 3. Server State (TanStack Query)

For data from the backend:

```typescript
function useBuyers(trackerId: string) {
  return useQuery({
    queryKey: ["buyers", trackerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buyers")
        .select("*")
        .eq("tracker_id", trackerId);
      
      if (error) throw error;
      return data;
    }
  });
}

function TrackerBuyersTab({ trackerId }: Props) {
  const { data: buyers, isLoading, error } = useBuyers(trackerId);
  
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState error={error} />;
  
  return <BuyersList buyers={buyers} />;
}
```

### 4. URL State

For shareable/bookmarkable state:

```typescript
function DealMatching() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const filter = searchParams.get("filter") || "all";
  const sort = searchParams.get("sort") || "score";
  
  const setFilter = (value: string) => {
    setSearchParams(prev => {
      prev.set("filter", value);
      return prev;
    });
  };
  
  return (
    <div>
      <Select value={filter} onValueChange={setFilter}>
        <SelectItem value="all">All Buyers</SelectItem>
        <SelectItem value="selected">Selected</SelectItem>
        <SelectItem value="passed">Passed</SelectItem>
      </Select>
    </div>
  );
}
```

---

## Styling Patterns

### 1. Tailwind Utility Classes

```typescript
function ScoreBadge({ score }: { score: number }) {
  const tier = getScoreTier(score);
  
  return (
    <Badge 
      className={cn(
        "font-medium",
        tier === "Excellent" && "bg-green-100 text-green-800",
        tier === "Strong" && "bg-blue-100 text-blue-800",
        tier === "Moderate" && "bg-yellow-100 text-yellow-800",
        tier === "Weak" && "bg-orange-100 text-orange-800",
        tier === "Poor" && "bg-red-100 text-red-800"
      )}
    >
      {tier}
    </Badge>
  );
}
```

### 2. CSS Variables (Design Tokens)

```css
/* src/index.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

### 3. Component Variants (CVA)

```typescript
// src/components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
```

---

## Performance Patterns

### 1. Memoization

```typescript
const MemoizedBuyerCard = React.memo(function BuyerCard({ buyer }: Props) {
  return (
    <Card>
      {/* Expensive render */}
    </Card>
  );
});

// With custom comparison
const MemoizedScoreCard = React.memo(
  function ScoreCard({ score, buyer }: Props) {
    return <div>{/* ... */}</div>;
  },
  (prevProps, nextProps) => {
    return prevProps.score.compositeScore === nextProps.score.compositeScore;
  }
);
```

### 2. Lazy Loading

```typescript
// Route-level lazy loading
const DealMatching = lazy(() => import("./pages/DealMatching"));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/deal/:id/match" element={<DealMatching />} />
      </Routes>
    </Suspense>
  );
}
```

### 3. Virtual Lists

For long lists:

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

function BuyerList({ buyers }: { buyers: Buyer[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: buyers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5
  });
  
  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: virtualRow.start,
              height: virtualRow.size
            }}
          >
            <BuyerRow buyer={buyers[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Testing Patterns

### 1. Component Tests

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { BuyerCard } from "./BuyerCard";

describe("BuyerCard", () => {
  const mockBuyer = {
    id: "1",
    pe_firm_name: "ABC Capital",
    platform_company_name: "Platform Co"
  };
  
  it("renders buyer information", () => {
    render(<BuyerCard buyer={mockBuyer} />);
    
    expect(screen.getByText("ABC Capital")).toBeInTheDocument();
    expect(screen.getByText("Platform Co")).toBeInTheDocument();
  });
  
  it("calls onSelect when clicked", () => {
    const onSelect = jest.fn();
    render(<BuyerCard buyer={mockBuyer} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByRole("button", { name: /select/i }));
    
    expect(onSelect).toHaveBeenCalledWith("1");
  });
});
```

### 2. Hook Tests

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { useBuyers } from "./useBuyers";

describe("useBuyers", () => {
  it("fetches buyers for tracker", async () => {
    const { result } = renderHook(() => useBuyers("tracker-1"), {
      wrapper: QueryProvider
    });
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data).toHaveLength(5);
  });
});
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `BuyerCard.tsx` |
| Hooks | camelCase, use prefix | `useBuyers.ts` |
| Utilities | camelCase | `formatCurrency.ts` |
| Types | PascalCase | `types.ts` |
| Constants | UPPER_SNAKE_CASE | `constants.ts` |
| Tests | `.test.tsx` suffix | `BuyerCard.test.tsx` |
| Styles | `.css` extension | `index.css` |
