import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Search, ChevronDown, ChevronRight, Building2, RefreshCw, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePEFirmsHierarchy, PEFirmWithPlatforms } from "@/hooks/usePEFirmsHierarchy";

export default function AllBuyers() {
  const { peFirms, isLoading: isLoadingNew, refetch } = usePEFirmsHierarchy();
  const [trackers, setTrackers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedFirms, setExpandedFirms] = useState<Set<string>>(new Set());
  const [isMigrating, setIsMigrating] = useState(false);
  const { toast } = useToast();

  // Also check if we have legacy buyers that need migration
  const [legacyBuyerCount, setLegacyBuyerCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [trackersRes, buyersCountRes] = await Promise.all([
      supabase.from("industry_trackers").select("id, industry_name"),
      supabase.from("buyers").select("id", { count: "exact", head: true }),
    ]);

    const trackerMap: Record<string, string> = {};
    (trackersRes.data || []).forEach((t) => { 
      trackerMap[t.id] = t.industry_name; 
    });
    setTrackers(trackerMap);
    setLegacyBuyerCount(buyersCountRes.count || 0);
    setIsLoading(false);
  };

  const migrateData = async () => {
    setIsMigrating(true);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-buyers-to-hierarchy');
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: "Migration complete",
          description: data.message,
        });
        refetch();
      } else {
        throw new Error(data.error || "Migration failed");
      }
    } catch (err: any) {
      toast({
        title: "Migration failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

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

  const expandAll = () => {
    setExpandedFirms(new Set(filteredFirms.map(f => f.id)));
  };

  const collapseAll = () => {
    setExpandedFirms(new Set());
  };

  // Filter PE firms and their platforms
  const filteredFirms = peFirms.filter((firm) => {
    const searchLower = search.toLowerCase();
    // Match PE firm name
    if (firm.name.toLowerCase().includes(searchLower)) return true;
    // Match any platform name
    if (firm.platforms.some(p => p.name.toLowerCase().includes(searchLower))) return true;
    return false;
  });

  // Get total platform count
  const totalPlatforms = peFirms.reduce((acc, firm) => acc + firm.platforms.length, 0);

  if (isLoading || isLoadingNew) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Show migration prompt if we have legacy data but no new data
  const needsMigration = legacyBuyerCount > 0 && peFirms.length === 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">All Buyers</h1>
            <p className="text-muted-foreground">
              {peFirms.length} PE firm{peFirms.length !== 1 ? "s" : ""} · {totalPlatforms} platform{totalPlatforms !== 1 ? "s" : ""}
            </p>
          </div>
          {needsMigration && (
            <Button onClick={migrateData} disabled={isMigrating}>
              {isMigrating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Migrate {legacyBuyerCount} Buyers
                </>
              )}
            </Button>
          )}
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
          {filteredFirms.length > 0 && (
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

        {filteredFirms.length === 0 ? (
          <div className="bg-card rounded-lg border p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">
              {search ? "No matches found" : needsMigration ? "Data needs migration" : "No buyers yet"}
            </h3>
            <p className="text-muted-foreground">
              {search 
                ? "Try a different search term" 
                : needsMigration 
                  ? "Click 'Migrate Buyers' to convert your existing data to the new structure."
                  : "Add buyers to a universe to get started."
              }
            </p>
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
