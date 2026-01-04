import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Users, Search, FileCheck, ArrowUp, ArrowDown, ArrowUpDown, Building2, Layers } from "lucide-react";
import { usePEFirmsHierarchy } from "@/hooks/usePEFirmsHierarchy";

type ViewMode = "all" | "pe_firms" | "platforms";
type SortColumn = "name" | "pe_firm" | "industry" | "confidence" | "platforms_count";
type SortDirection = "asc" | "desc";

interface FlatBuyer {
  id: string;
  name: string;
  peFirmId: string;
  peFirmName: string;
  industryVertical: string | null;
  thesisSummary: string | null;
  thesisConfidence: string | null;
  hasFeeAgreement: boolean | null;
  trackerIds: string[];
  isLegacy: boolean;
}

interface FlatPEFirm {
  id: string;
  name: string;
  platformsCount: number;
  industryVertical: string | null;
  thesisSummary: string | null;
  thesisConfidence: string | null;
  hasFeeAgreement: boolean | null;
  trackerIds: string[];
}

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  name: 200,
  pe_firm: 180,
  platforms_count: 100,
  industry: 130,
  thesis: 250,
  fee: 110,
  confidence: 100,
  universe: 180,
};

export default function AllBuyers() {
  const { peFirms, isLoading: isLoadingNew } = usePEFirmsHierarchy();
  const [legacyBuyers, setLegacyBuyers] = useState<any[]>([]);
  const [trackers, setTrackers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [trackersRes, buyersRes] = await Promise.all([
      supabase.from("industry_trackers").select("id, industry_name"),
      supabase.from("buyers").select("id, pe_firm_name, platform_company_name, platform_website, thesis_summary, thesis_confidence, industry_vertical, tracker_id, has_fee_agreement, fee_agreement_status").order("pe_firm_name")
    ]);

    const trackerMap: Record<string, string> = {};
    (trackersRes.data || []).forEach((t) => { 
      trackerMap[t.id] = t.industry_name; 
    });
    setTrackers(trackerMap);
    setLegacyBuyers(buyersRes.data || []);
    setIsLoading(false);
  };

  // Flatten platforms into a single array
  const flatBuyers = useMemo((): FlatBuyer[] => {
    const useLegacy = peFirms.length === 0 && legacyBuyers.length > 0;
    
    if (useLegacy) {
      const grouped: Record<string, { buyers: any[], trackerIds: Set<string> }> = {};
      legacyBuyers.forEach(b => {
        if (!grouped[b.pe_firm_name]) {
          grouped[b.pe_firm_name] = { buyers: [], trackerIds: new Set() };
        }
        grouped[b.pe_firm_name].buyers.push(b);
        grouped[b.pe_firm_name].trackerIds.add(b.tracker_id);
      });
      
      return legacyBuyers.map(b => ({
        id: b.id,
        name: b.platform_company_name || b.pe_firm_name,
        peFirmId: b.pe_firm_name,
        peFirmName: b.pe_firm_name,
        industryVertical: b.industry_vertical,
        thesisSummary: b.thesis_summary,
        thesisConfidence: b.thesis_confidence,
        hasFeeAgreement: b.has_fee_agreement || b.fee_agreement_status === 'Signed',
        trackerIds: Array.from(grouped[b.pe_firm_name].trackerIds),
        isLegacy: true,
      }));
    }
    
    return peFirms.flatMap(firm => 
      firm.platforms.map(platform => ({
        id: platform.id,
        name: platform.name,
        peFirmId: firm.id,
        peFirmName: firm.name,
        industryVertical: platform.industry_vertical,
        thesisSummary: platform.thesis_summary,
        thesisConfidence: platform.thesis_confidence,
        hasFeeAgreement: platform.has_fee_agreement || firm.has_fee_agreement,
        trackerIds: firm.trackerIds,
        isLegacy: false,
      }))
    );
  }, [peFirms, legacyBuyers]);

  // Aggregate PE Firms for PE Firms view
  const flatPEFirms = useMemo((): FlatPEFirm[] => {
    const useLegacy = peFirms.length === 0 && legacyBuyers.length > 0;
    
    if (useLegacy) {
      const grouped: Record<string, FlatPEFirm> = {};
      legacyBuyers.forEach(b => {
        if (!grouped[b.pe_firm_name]) {
          grouped[b.pe_firm_name] = {
            id: b.pe_firm_name,
            name: b.pe_firm_name,
            platformsCount: 0,
            industryVertical: b.industry_vertical,
            thesisSummary: b.thesis_summary,
            thesisConfidence: b.thesis_confidence,
            hasFeeAgreement: b.has_fee_agreement || b.fee_agreement_status === 'Signed',
            trackerIds: [],
          };
        }
        grouped[b.pe_firm_name].platformsCount++;
        if (b.tracker_id && !grouped[b.pe_firm_name].trackerIds.includes(b.tracker_id)) {
          grouped[b.pe_firm_name].trackerIds.push(b.tracker_id);
        }
        if (b.has_fee_agreement) grouped[b.pe_firm_name].hasFeeAgreement = true;
      });
      return Object.values(grouped);
    }
    
    return peFirms.map(firm => {
      const firstPlatform = firm.platforms[0];
      const highestConfidence = firm.platforms.reduce((best, p) => {
        const order = { high: 3, medium: 2, low: 1 };
        const currentOrder = order[(p.thesis_confidence as keyof typeof order)] || 0;
        const bestOrder = order[(best as keyof typeof order)] || 0;
        return currentOrder > bestOrder ? p.thesis_confidence : best;
      }, firstPlatform?.thesis_confidence || null);
      
      return {
        id: firm.id,
        name: firm.name,
        platformsCount: firm.platforms.length,
        industryVertical: firstPlatform?.industry_vertical || null,
        thesisSummary: firstPlatform?.thesis_summary || null,
        thesisConfidence: highestConfidence,
        hasFeeAgreement: firm.has_fee_agreement || firm.platforms.some(p => p.has_fee_agreement),
        trackerIds: firm.trackerIds,
      };
    });
  }, [peFirms, legacyBuyers]);

  // Filter based on view mode and search
  const filteredData = useMemo(() => {
    const searchLower = search.toLowerCase();
    
    if (viewMode === "pe_firms") {
      if (!search) return flatPEFirms;
      return flatPEFirms.filter(f => 
        f.name.toLowerCase().includes(searchLower) ||
        (f.industryVertical?.toLowerCase().includes(searchLower)) ||
        (f.thesisSummary?.toLowerCase().includes(searchLower))
      );
    }
    
    const buyers = viewMode === "platforms" ? flatBuyers : flatBuyers;
    if (!search) return buyers;
    
    return buyers.filter(b => 
      b.name.toLowerCase().includes(searchLower) ||
      b.peFirmName.toLowerCase().includes(searchLower) ||
      (b.industryVertical?.toLowerCase().includes(searchLower)) ||
      (b.thesisSummary?.toLowerCase().includes(searchLower))
    );
  }, [flatBuyers, flatPEFirms, viewMode, search]);

  // Sort data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      
      switch (sortColumn) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "pe_firm":
          aVal = ((a as FlatBuyer).peFirmName || "").toLowerCase();
          bVal = ((b as FlatBuyer).peFirmName || "").toLowerCase();
          break;
        case "platforms_count":
          aVal = (a as FlatPEFirm).platformsCount || 0;
          bVal = (b as FlatPEFirm).platformsCount || 0;
          return sortDirection === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        case "industry":
          aVal = ((a as FlatBuyer).industryVertical || "").toLowerCase();
          bVal = ((b as FlatBuyer).industryVertical || "").toLowerCase();
          break;
        case "confidence":
          const order = { high: 3, medium: 2, low: 1 };
          const aOrder = order[((a as FlatBuyer).thesisConfidence as keyof typeof order)] || 0;
          const bOrder = order[((b as FlatBuyer).thesisConfidence as keyof typeof order)] || 0;
          return sortDirection === "asc" ? aOrder - bOrder : bOrder - aOrder;
        default:
          return 0;
      }
      
      const comparison = (aVal as string).localeCompare(bVal as string);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleResize = (columnKey: string, startX: number, startWidth: number) => (e: MouseEvent) => {
    const newWidth = Math.max(50, startWidth + (e.clientX - startX));
    setColumnWidths(prev => ({ ...prev, [columnKey]: newWidth }));
  };

  const startResize = (columnKey: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[columnKey];
    
    const onMouseMove = handleResize(columnKey, startX, startWidth);
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const ResizeHandle = ({ columnKey }: { columnKey: string }) => (
    <div
      onMouseDown={startResize(columnKey)}
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary group-hover:bg-border"
    />
  );

  const SortableHeader = ({ column, columnKey, children, className = "" }: { column: SortColumn; columnKey: string; children: React.ReactNode; className?: string }) => (
    <TableHead className={`relative group ${className}`} style={{ width: columnWidths[columnKey], minWidth: columnWidths[columnKey] }}>
      <button
        onClick={() => toggleSort(column)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {children}
        {sortColumn === column ? (
          sortDirection === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </button>
      <ResizeHandle columnKey={columnKey} />
    </TableHead>
  );

  const ResizableHeader = ({ columnKey, children, className = "" }: { columnKey: string; children: React.ReactNode; className?: string }) => (
    <TableHead className={`relative group ${className}`} style={{ width: columnWidths[columnKey], minWidth: columnWidths[columnKey] }}>
      {children}
      <ResizeHandle columnKey={columnKey} />
    </TableHead>
  );

  const totalFirms = new Set(flatBuyers.map(b => b.peFirmName)).size;

  if (isLoading || isLoadingNew) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold">All Buyers</h1>
              <p className="text-muted-foreground">
                {totalFirms} PE firm{totalFirms !== 1 ? "s" : ""} · {flatBuyers.length} platform{flatBuyers.length !== 1 ? "s" : ""}
                {search && <span className="text-primary"> (filtered: {filteredData.length})</span>}
              </p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "all" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("all")}
                className="gap-1.5"
              >
                <Layers className="w-4 h-4" />
                All
              </Button>
              <Button
                variant={viewMode === "pe_firms" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("pe_firms")}
                className="gap-1.5"
              >
                <Building2 className="w-4 h-4" />
                PE Firms
              </Button>
              <Button
                variant={viewMode === "platforms" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("platforms")}
                className="gap-1.5"
              >
                <Users className="w-4 h-4" />
                Platforms
              </Button>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder={viewMode === "pe_firms" ? "Search PE firms, industries..." : "Search platforms, PE firms, industries..."} 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-10" 
            />
          </div>

          {sortedData.length === 0 ? (
            <div className="bg-card rounded-lg border p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">
                {search ? "No matches found" : "No buyers yet"}
              </h3>
              <p className="text-muted-foreground">
                {search 
                  ? "Try a different search term" 
                  : "Add buyers to a universe to get started."
                }
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {viewMode === "pe_firms" ? (
                      <>
                        <SortableHeader column="name" columnKey="name">PE Firm</SortableHeader>
                        <SortableHeader column="platforms_count" columnKey="platforms_count">Platforms</SortableHeader>
                      </>
                    ) : (
                      <>
                        <SortableHeader column="name" columnKey="name">Platform</SortableHeader>
                        <SortableHeader column="pe_firm" columnKey="pe_firm">PE Firm</SortableHeader>
                      </>
                    )}
                    <SortableHeader column="industry" columnKey="industry">Industry</SortableHeader>
                    <ResizableHeader columnKey="thesis">Thesis</ResizableHeader>
                    <ResizableHeader columnKey="fee" className="text-center">Fee Agreement</ResizableHeader>
                    <SortableHeader column="confidence" columnKey="confidence" className="text-center">Confidence</SortableHeader>
                    <ResizableHeader columnKey="universe">Buyer Universe</ResizableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewMode === "pe_firms" ? (
                    // PE Firms View
                    (sortedData as FlatPEFirm[]).map((firm) => {
                      const universeNames = firm.trackerIds
                        .map(id => trackers[id])
                        .filter(Boolean)
                        .slice(0, 2);
                      
                      return (
                        <TableRow key={firm.id} className="group">
                          <TableCell className="font-medium">
                            <Link to={`/pe-firms/${firm.id}`} className="hover:text-primary transition-colors">
                              {firm.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {firm.platformsCount}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {firm.industryVertical ? (
                              <Badge variant="secondary" className="text-xs font-normal">
                                {firm.industryVertical}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[250px]">
                            {firm.thesisSummary ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-sm text-muted-foreground truncate block cursor-default">
                                    {firm.thesisSummary}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm">
                                  <p className="text-sm">{firm.thesisSummary}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {firm.hasFeeAgreement && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1 bg-primary/10 border-primary/20 w-fit mx-auto">
                                <FileCheck className="w-3 h-3" />
                                Signed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {firm.thesisConfidence ? (
                              <Badge 
                                variant={firm.thesisConfidence === "high" ? "default" : "secondary"}
                                className="text-xs capitalize"
                              >
                                {firm.thesisConfidence}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 flex-wrap">
                              {universeNames.map((name, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {name}
                                </Badge>
                              ))}
                              {firm.trackerIds.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{firm.trackerIds.length - 2}
                                </Badge>
                              )}
                              {universeNames.length === 0 && (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    // Platforms View (All or Platforms only)
                    (sortedData as FlatBuyer[]).map((buyer) => {
                      const universeNames = buyer.trackerIds
                        .map(id => trackers[id])
                        .filter(Boolean)
                        .slice(0, 2);
                      
                      const linkTo = buyer.isLegacy ? `/buyers/${buyer.id}` : `/platforms/${buyer.id}`;
                      
                      return (
                        <TableRow key={buyer.id} className="group">
                          <TableCell className="font-medium">
                            <Link to={linkTo} className="hover:text-primary transition-colors">
                              {buyer.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {buyer.peFirmName}
                          </TableCell>
                          <TableCell>
                            {buyer.industryVertical ? (
                              <Badge variant="secondary" className="text-xs font-normal">
                                {buyer.industryVertical}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[250px]">
                            {buyer.thesisSummary ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-sm text-muted-foreground truncate block cursor-default">
                                    {buyer.thesisSummary}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm">
                                  <p className="text-sm">{buyer.thesisSummary}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {buyer.hasFeeAgreement && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1 bg-primary/10 border-primary/20 w-fit mx-auto">
                                <FileCheck className="w-3 h-3" />
                                Signed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {buyer.thesisConfidence ? (
                              <Badge 
                                variant={buyer.thesisConfidence === "high" ? "default" : "secondary"}
                                className="text-xs capitalize"
                              >
                                {buyer.thesisConfidence}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 flex-wrap">
                              {universeNames.map((name, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {name}
                                </Badge>
                              ))}
                              {buyer.trackerIds.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{buyer.trackerIds.length - 2}
                                </Badge>
                              )}
                              {universeNames.length === 0 && (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </TooltipProvider>
    </AppLayout>
  );
}
