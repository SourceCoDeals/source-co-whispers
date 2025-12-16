import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { IntelligenceBadge } from "@/components/IntelligenceBadge";
import { Loader2, Users, Search } from "lucide-react";

export default function AllBuyers() {
  const [buyers, setBuyers] = useState<any[]>([]);
  const [trackers, setTrackers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadBuyers();
  }, []);

  const loadBuyers = async () => {
    const [buyersRes, trackersRes] = await Promise.all([
      supabase.from("buyers").select("*").order("pe_firm_name"),
      supabase.from("industry_trackers").select("id, industry_name"),
    ]);
    
    setBuyers(buyersRes.data || []);
    const trackerMap: Record<string, string> = {};
    (trackersRes.data || []).forEach((t) => { trackerMap[t.id] = t.industry_name; });
    setTrackers(trackerMap);
    setIsLoading(false);
  };

  const filteredBuyers = buyers.filter((b) => 
    b.pe_firm_name.toLowerCase().includes(search.toLowerCase()) ||
    (b.platform_company_name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">All Buyers</h1>
          <p className="text-muted-foreground">{buyers.length} buyers across all universes</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search buyers..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-10" 
          />
        </div>

        {filteredBuyers.length === 0 ? (
          <div className="bg-card rounded-lg border p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">{search ? "No matches found" : "No buyers yet"}</h3>
            <p className="text-muted-foreground">{search ? "Try a different search term" : "Add buyers to a universe to get started."}</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border divide-y">
            {filteredBuyers.map((buyer) => (
              <Link key={buyer.id} to={`/buyers/${buyer.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">{buyer.pe_firm_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {buyer.platform_company_name && `${buyer.platform_company_name} · `}
                    {trackers[buyer.tracker_id] || "Unknown"}
                  </p>
                </div>
                <IntelligenceBadge buyer={buyer} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
