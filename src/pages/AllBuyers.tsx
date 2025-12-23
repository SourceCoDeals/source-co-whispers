import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Search, ChevronDown, ChevronRight, Building2, Globe } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePEFirmsHierarchy, PEFirmWithPlatforms } from "@/hooks/usePEFirmsHierarchy";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

interface LegacyBuyer {
  id: string;
  pe_firm_name: string;
  platform_company_name: string | null;
  platform_website: string | null;
  thesis_summary: string | null;
  thesis_confidence: string | null;
  industry_vertical: string | null;
  tracker_id: string;
}

interface GroupedBuyers {
  peFirmName: string;
  buyers: LegacyBuyer[];
  trackerIds: string[];
}

export default function AllBuyers() {
  const { peFirms, isLoading: isLoadingNew } = usePEFirmsHierarchy();
  const [legacyBuyers, setLegacyBuyers] = useState<LegacyBuyer[]>([]);
  const [trackers, setTrackers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedFirms, setExpandedFirms] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [trackersRes, buyersRes] = await Promise.all([
      supabase.from("industry_trackers").select("id, industry_name"),
      supabase.from("buyers").select("id, pe_firm_name, platform_company_name, platform_website, thesis_summary, thesis_confidence, industry_vertical, tracker_id").order("pe_firm_name")
    ]);

    const trackerMap: Record<string, string> = {};
    (trackersRes.data || []).forEach((t) => { 
      trackerMap[t.id] = t.industry_name; 
    });
    setTrackers(trackerMap);
    setLegacyBuyers(buyersRes.data || []);
    setIsLoading(false);
  };
  
  // Group legacy buyers by PE firm name
  const groupedLegacyBuyers: GroupedBuyers[] = legacyBuyers.reduce((acc, buyer) => {
    const existing = acc.find(g => g.peFirmName === buyer.pe_firm_name);
    if (existing) {
      existing.buyers.push(buyer);
      if (!existing.trackerIds.includes(buyer.tracker_id)) {
        existing.trackerIds.push(buyer.tracker_id);
      }
    } else {
      acc.push({
        peFirmName: buyer.pe_firm_name,
        buyers: [buyer],
        trackerIds: [buyer.tracker_id]
      });
    }
    return acc;
  }, [] as GroupedBuyers[]);

  // Determine if we should use legacy buyers (when pe_firms table is empty)
  const useLegacyBuyers = peFirms.length === 0 && legacyBuyers.length > 0;

  const toggleFirm = (firmId: string) => {
    setExpandedFirms(prev => {
      const next = new Set(prev);
      if (next.has(firmId)) {
        next.delete(firmId);
      } else {
        next.add(firmId);
      }
      return next;
    });
  };

  // Filter PE firms and their platforms (new hierarchy)
  const filteredFirms = peFirms.filter((firm) => {
    const searchLower = search.toLowerCase();
    if (firm.name.toLowerCase().includes(searchLower)) return true;
    if (firm.platforms.some(p => p.name.toLowerCase().includes(searchLower))) return true;
    return false;
  });

  // Filter legacy buyers
  const filteredLegacyGroups = groupedLegacyBuyers.filter((group) => {
    const searchLower = search.toLowerCase();
    if (group.peFirmName.toLowerCase().includes(searchLower)) return true;
    if (group.buyers.some(b => (b.platform_company_name || '').toLowerCase().includes(searchLower))) return true;
    return false;
  });

  // Get total counts
  const totalPlatforms = useLegacyBuyers 
    ? legacyBuyers.length 
    : peFirms.reduce((acc, firm) => acc + firm.platforms.length, 0);
  const totalFirms = useLegacyBuyers ? groupedLegacyBuyers.length : peFirms.length;
  const displayedItems = useLegacyBuyers ? filteredLegacyGroups : filteredFirms;

  const expandAll = () => {
    if (useLegacyBuyers) {
      setExpandedFirms(new Set(filteredLegacyGroups.map(f => f.peFirmName)));
    } else {
      setExpandedFirms(new Set(filteredFirms.map(f => f.id)));
    }
  };

  const collapseAll = () => {
    setExpandedFirms(new Set());
  };

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">All Buyers</h1>
            <p className="text-muted-foreground">
              {totalFirms} PE firm{totalFirms !== 1 ? "s" : ""} · {totalPlatforms} platform{totalPlatforms !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search PE firms or platforms..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-10" 
            />
          </div>
          {displayedItems.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          )}
        </div>

        {displayedItems.length === 0 ? (
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
        ) : useLegacyBuyers ? (
          <div className="bg-card rounded-lg border divide-y">
            {filteredLegacyGroups.map((group) => (
              <LegacyPEFirmRow 
                key={group.peFirmName} 
                group={group} 
                trackers={trackers}
                isExpanded={expandedFirms.has(group.peFirmName)}
                onToggle={() => toggleFirm(group.peFirmName)}
                searchTerm={search}
              />
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-lg border divide-y">
            {filteredFirms.map((firm) => (
              <PEFirmRow 
                key={firm.id} 
                firm={firm} 
                trackers={trackers}
                isExpanded={expandedFirms.has(firm.id)}
                onToggle={() => toggleFirm(firm.id)}
                searchTerm={search}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// Legacy buyer row component (for buyers table fallback)
interface LegacyPEFirmRowProps {
  group: GroupedBuyers;
  trackers: Record<string, string>;
  isExpanded: boolean;
  onToggle: () => void;
  searchTerm: string;
}

function LegacyPEFirmRow({ group, trackers, isExpanded, onToggle, searchTerm }: LegacyPEFirmRowProps) {
  const universeNames = group.trackerIds
    .map(id => trackers[id])
    .filter(Boolean)
    .slice(0, 3);

  const hasMultipleBuyers = group.buyers.length > 1;
  const searchLower = searchTerm.toLowerCase();

  // Filter buyers if searching
  const visibleBuyers = searchTerm 
    ? group.buyers.filter(b => 
        (b.platform_company_name || '').toLowerCase().includes(searchLower) || 
        group.peFirmName.toLowerCase().includes(searchLower)
      )
    : group.buyers;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            {hasMultipleBuyers ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )
            ) : (
              <div className="w-4" />
            )}
            <Building2 className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">{group.peFirmName}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{group.buyers.length} platform{group.buyers.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {universeNames.map((name, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {name}
              </Badge>
            ))}
            {group.trackerIds.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{group.trackerIds.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-t bg-muted/30">
          {visibleBuyers.map((buyer) => (
            <Link 
              key={buyer.id} 
              to={`/buyers/${buyer.id}`}
              className="flex items-center justify-between px-4 py-3 pl-12 hover:bg-muted/50 transition-colors border-t first:border-t-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary/60" />
                <div>
                  <p className="font-medium text-sm">{buyer.platform_company_name || buyer.pe_firm_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {buyer.industry_vertical || "No industry specified"}
                    {buyer.thesis_summary && ` · ${buyer.thesis_summary.slice(0, 60)}...`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {buyer.thesis_confidence && (
                  <Badge 
                    variant={buyer.thesis_confidence === "high" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {buyer.thesis_confidence}
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// PE Firm Row for new hierarchy
interface PEFirmRowProps {
  firm: PEFirmWithPlatforms;
  trackers: Record<string, string>;
  isExpanded: boolean;
  onToggle: () => void;
  searchTerm: string;
}

function PEFirmRow({ firm, trackers, isExpanded, onToggle, searchTerm }: PEFirmRowProps) {
  const universeNames = firm.trackerIds
    .map(id => trackers[id])
    .filter(Boolean)
    .slice(0, 3);

  const hasMultiplePlatforms = firm.platforms.length > 1;
  const searchLower = searchTerm.toLowerCase();

  // Filter platforms if searching
  const visiblePlatforms = searchTerm 
    ? firm.platforms.filter(p => 
        p.name.toLowerCase().includes(searchLower) || 
        firm.name.toLowerCase().includes(searchLower)
      )
    : firm.platforms;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            {hasMultiplePlatforms ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )
            ) : (
              <div className="w-4" />
            )}
            <Building2 className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">{firm.name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{firm.platforms.length} platform{firm.platforms.length !== 1 ? "s" : ""}</span>
                {firm.website && (
                  <>
                    <span>·</span>
                    <a 
                      href={firm.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-primary flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Globe className="w-3 h-3" />
                      Website
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {universeNames.map((name, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {name}
              </Badge>
            ))}
            {firm.trackerIds.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{firm.trackerIds.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-t bg-muted/30">
          {visiblePlatforms.map((platform) => (
            <Link 
              key={platform.id} 
              to={`/platforms/${platform.id}`}
              className="flex items-center justify-between px-4 py-3 pl-12 hover:bg-muted/50 transition-colors border-t first:border-t-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary/60" />
                <div>
                  <p className="font-medium text-sm">{platform.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {platform.industry_vertical || "No industry specified"}
                    {platform.thesis_summary && ` · ${platform.thesis_summary.slice(0, 60)}...`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {platform.thesis_confidence && (
                  <Badge 
                    variant={platform.thesis_confidence === "high" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {platform.thesis_confidence}
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}