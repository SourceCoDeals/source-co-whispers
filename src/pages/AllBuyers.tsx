import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Users, Search, FileCheck, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { usePEFirmsHierarchy, PEFirmWithPlatforms } from "@/hooks/usePEFirmsHierarchy";
import { Platform } from "@/hooks/usePEFirmsHierarchy";

type SortColumn = "platform" | "pe_firm" | "industry" | "geography" | "confidence";
type SortDirection = "asc" | "desc";

interface FlatBuyer {
  id: string;
  name: string;
  peFirmId: string;
  peFirmName: string;
  industryVertical: string | null;
  thesisSummary: string | null;
  thesisConfidence: string | null;
  targetGeographies: string[] | null;
  hasFeeAgreement: boolean | null;
  trackerIds: string[];
  isLegacy: boolean;
}

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  platform: 200,
  pe_firm: 180,
  industry: 130,
  thesis: 250,
  geography: 150,
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
  const [sortColumn, setSortColumn] = useState<SortColumn>("platform");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [trackersRes, buyersRes] = await Promise.all([
      supabase.from("industry_trackers").select("id, industry_name"),
      supabase.from("buyers").select("id, pe_firm_name, platform_company_name, platform_website, thesis_summary, thesis_confidence, industry_vertical, tracker_id, has_fee_agreement, fee_agreement_status, target_geographies").order("pe_firm_name")
    ]);

    const trackerMap: Record<string, string> = {};
    (trackersRes.data || []).forEach((t) => { 
      trackerMap[t.id] = t.industry_name; 
    });
    setTrackers(trackerMap);
    setLegacyBuyers(buyersRes.data || []);
    setIsLoading(false);
  };

  // Flatten data into a single array of buyers
  const flatBuyers = useMemo((): FlatBuyer[] => {
    const useLegacy = peFirms.length === 0 && legacyBuyers.length > 0;
    
    if (useLegacy) {
      // Group legacy buyers by PE firm to get tracker IDs
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
        targetGeographies: b.target_geographies,
        hasFeeAgreement: b.has_fee_agreement || b.fee_agreement_status === 'Signed',
        trackerIds: Array.from(grouped[b.pe_firm_name].trackerIds),
        isLegacy: true,
      }));
    }
    
    // Flatten new hierarchy
    return peFirms.flatMap(firm => 
      firm.platforms.map(platform => ({
        id: platform.id,
        name: platform.name,
        peFirmId: firm.id,
        peFirmName: firm.name,
        industryVertical: platform.industry_vertical,
        thesisSummary: platform.thesis_summary,
        thesisConfidence: platform.thesis_confidence,
        targetGeographies: (platform as any).target_geographies || null,
        hasFeeAgreement: platform.has_fee_agreement || firm.has_fee_agreement,
        trackerIds: firm.trackerIds,
        isLegacy: false,
      }))
    );
  }, [peFirms, legacyBuyers]);

  // Filter buyers
  const filteredBuyers = useMemo(() => {
    if (!search) return flatBuyers;
    
    const searchLower = search.toLowerCase();
    return flatBuyers.filter(b => 
      b.name.toLowerCase().includes(searchLower) ||
      b.peFirmName.toLowerCase().includes(searchLower) ||
      (b.industryVertical?.toLowerCase().includes(searchLower)) ||
      (b.thesisSummary?.toLowerCase().includes(searchLower))
    );
  }, [flatBuyers, search]);

  // Sort buyers
  const sortedBuyers = useMemo(() => {
    return [...filteredBuyers].sort((a, b) => {
      let aVal: string, bVal: string;
      
      switch (sortColumn) {
        case "platform":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "pe_firm":
          aVal = a.peFirmName.toLowerCase();
          bVal = b.peFirmName.toLowerCase();
          break;
        case "industry":
          aVal = (a.industryVertical || "").toLowerCase();
          bVal = (b.industryVertical || "").toLowerCase();
          break;
        case "geography":
          aVal = (a.targetGeographies?.[0] || "").toLowerCase();
          bVal = (b.targetGeographies?.[0] || "").toLowerCase();
          break;
        case "confidence":
          const order = { high: 3, medium: 2, low: 1 };
          const aOrder = order[(a.thesisConfidence as keyof typeof order)] || 0;
          const bOrder = order[(b.thesisConfidence as keyof typeof order)] || 0;
          return sortDirection === "asc" ? aOrder - bOrder : bOrder - aOrder;
        default:
          return 0;
      }
      
      const comparison = aVal.localeCompare(bVal);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredBuyers, sortColumn, sortDirection]);

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
                {search && <span className="text-primary"> (filtered: {filteredBuyers.length})</span>}
              </p>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search platforms, PE firms, industries..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-10" 
            />
          </div>

          {sortedBuyers.length === 0 ? (
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
                    <SortableHeader column="platform" columnKey="platform">Platform</SortableHeader>
                    <SortableHeader column="pe_firm" columnKey="pe_firm">PE Firm</SortableHeader>
                    <SortableHeader column="industry" columnKey="industry">Industry</SortableHeader>
                    <ResizableHeader columnKey="thesis">Thesis</ResizableHeader>
                    <SortableHeader column="geography" columnKey="geography">Geography</SortableHeader>
                    <ResizableHeader columnKey="fee" className="text-center">Fee Agreement</ResizableHeader>
                    <SortableHeader column="confidence" columnKey="confidence" className="text-center">Confidence</SortableHeader>
                    <ResizableHeader columnKey="universe">Buyer Universe</ResizableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBuyers.map((buyer) => {
                    const universeNames = buyer.trackerIds
                      .map(id => trackers[id])
                      .filter(Boolean)
                      .slice(0, 2);
                    
                    const linkTo = buyer.isLegacy ? `/buyers/${buyer.id}` : `/platforms/${buyer.id}`;
                    
                    return (
                      <TableRow key={buyer.id} className="group">
                        {/* Platform Name */}
                        <TableCell className="font-medium">
                          <Link to={linkTo} className="hover:text-primary transition-colors">
                            {buyer.name}
                          </Link>
                        </TableCell>
                        
                        {/* PE Firm */}
                        <TableCell className="text-muted-foreground">
                          {buyer.peFirmName}
                        </TableCell>
                        
                        {/* Industry */}
                        <TableCell>
                          {buyer.industryVertical ? (
                            <Badge variant="secondary" className="text-xs font-normal">
                              {buyer.industryVertical}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        
                        {/* Thesis */}
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
                        
                        {/* Geography */}
                        <TableCell>
                          {buyer.targetGeographies && buyer.targetGeographies.length > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm truncate block max-w-[130px]">
                                  {buyer.targetGeographies.slice(0, 2).join(", ")}
                                  {buyer.targetGeographies.length > 2 && ` +${buyer.targetGeographies.length - 2}`}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-sm">{buyer.targetGeographies.join(", ")}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        
                        {/* Fee Agreement */}
                        <TableCell className="text-center">
                          {buyer.hasFeeAgreement && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1 bg-primary/10 border-primary/20 w-fit mx-auto">
                              <FileCheck className="w-3 h-3" />
                              Signed
                            </Badge>
                          )}
                        </TableCell>
                        
                        {/* Confidence */}
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
                        
                        {/* Buyer Universe */}
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
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </TooltipProvider>
    </AppLayout>
  );
}
