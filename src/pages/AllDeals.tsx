import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, FileText, ChevronRight, MoreHorizontal, Archive, Trash2, Building2, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { normalizeDomain } from "@/lib/normalizeDomain";
interface CompanyGroup {
  companyId: string | null;
  companyName: string;
  domain: string | null;
  deals: any[];
  revenue: number | null;
  geography: string[] | null;
}

export default function AllDeals() {
  const [deals, setDeals] = useState<any[]>([]);
  const [trackers, setTrackers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<CompanyGroup | null>(null);
  const { toast } = useToast();
  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    const [dealsRes, trackersRes] = await Promise.all([
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      supabase.from("industry_trackers").select("*"),
    ]);
    
    setDeals(dealsRes.data || []);
    const trackerMap: Record<string, any> = {};
    (trackersRes.data || []).forEach((t) => { trackerMap[t.id] = t; });
    setTrackers(trackerMap);
    setIsLoading(false);
  };

  const archiveDeal = async (e: React.MouseEvent, dealId: string, dealName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const { error } = await supabase.from("deals").update({ status: "Archived" }).eq("id", dealId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deal archived", description: `${dealName} has been archived` });
    loadDeals();
  };

  const deleteDeal = async (e: React.MouseEvent, dealId: string, dealName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete "${dealName}"? This cannot be undone.`)) return;
    
    const { error } = await supabase.from("deals").delete().eq("id", dealId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deal deleted", description: `${dealName} has been deleted` });
    loadDeals();
  };

  const archiveCompany = async (group: CompanyGroup) => {
    const dealIds = group.deals.map(d => d.id);
    const { error } = await supabase.from("deals").update({ status: "Archived" }).in("id", dealIds);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    
    toast({ 
      title: "Company archived", 
      description: `${group.companyName} has been archived from ${group.deals.length} universe${group.deals.length > 1 ? 's' : ''}` 
    });
    loadDeals();
  };

  const confirmDeleteCompany = (group: CompanyGroup) => {
    setCompanyToDelete(group);
    setDeleteDialogOpen(true);
  };

  const deleteCompany = async () => {
    if (!companyToDelete) return;
    
    const dealIds = companyToDelete.deals.map(d => d.id);
    
    // Delete all deals for this company
    const { error: dealsError } = await supabase.from("deals").delete().in("id", dealIds);
    if (dealsError) {
      toast({ title: "Error", description: dealsError.message, variant: "destructive" });
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
      return;
    }
    
    // Delete the company record if it exists
    if (companyToDelete.companyId) {
      await supabase.from("companies").delete().eq("id", companyToDelete.companyId);
    }
    
    toast({ 
      title: "Company deleted", 
      description: `${companyToDelete.companyName} has been permanently deleted` 
    });
    
    setDeleteDialogOpen(false);
    setCompanyToDelete(null);
    loadDeals();
  };

  // Group deals by company (using company_id or domain as fallback)
  const groupByCompany = (): CompanyGroup[] => {
    const groups: Record<string, CompanyGroup> = {};
    
    deals.forEach((deal) => {
      // Use company_id if available, otherwise use normalized domain
      const groupKey = deal.company_id || normalizeDomain(deal.company_website) || `deal-${deal.id}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          companyId: deal.company_id,
          companyName: deal.deal_name,
          domain: normalizeDomain(deal.company_website),
          deals: [],
          revenue: deal.revenue,
          geography: deal.geography,
        };
      }
      groups[groupKey].deals.push(deal);
    });

    return Object.values(groups).sort((a, b) => {
      // Sort by most recent deal
      const aLatest = Math.max(...a.deals.map(d => new Date(d.created_at).getTime()));
      const bLatest = Math.max(...b.deals.map(d => new Date(d.created_at).getTime()));
      return bLatest - aLatest;
    });
  };

  const companyGroups = groupByCompany();

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  }

  const uniqueCompanies = companyGroups.length;
  const totalTrackers = new Set(deals.map(d => d.tracker_id)).size;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">All Deals</h1>
          <p className="text-muted-foreground">
            {uniqueCompanies} {uniqueCompanies === 1 ? 'company' : 'companies'} across {totalTrackers} buyer universe{totalTrackers !== 1 ? 's' : ''}
          </p>
        </div>

        {deals.length === 0 ? (
          <div className="bg-card rounded-lg border p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No deals yet</h3>
            <p className="text-muted-foreground">List a deal in a buyer universe to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {companyGroups.map((group) => {
              const isMultiTracker = group.deals.length > 1;
              
              return (
                <div key={group.companyId || group.domain || group.deals[0].id} className="bg-card rounded-lg border overflow-hidden">
                  {/* Company Header */}
                  <div className="p-4 bg-muted/30 border-b">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="font-semibold truncate">{group.companyName}</h2>
                          {isMultiTracker && (
                            <Badge variant="secondary" className="text-xs">
                              {group.deals.length} universes
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {group.domain && (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {group.domain}
                            </span>
                          )}
                          {group.revenue && <span>${group.revenue}M</span>}
                          {group.geography?.length > 0 && <span>{group.geography.join(", ")}</span>}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => archiveCompany(group)}>
                            <Archive className="w-4 h-4 mr-2" />
                            Archive from all universes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => confirmDeleteCompany(group)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete permanently
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Deals in this company */}
                  <div className="divide-y">
                    {group.deals.map((deal) => {
                      const tracker = trackers[deal.tracker_id];
                      return (
                        <div key={deal.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group">
                          <Link to={`/deals/${deal.id}`} className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-primary">
                                {tracker?.industry_name || "Unknown"}
                              </span>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                            {isMultiTracker && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Listed {new Date(deal.created_at).toLocaleDateString()}
                              </p>
                            )}
                          </Link>
                          <div className="flex items-center gap-2">
                            <Badge variant={deal.status === "Active" ? "active" : deal.status === "Closed" ? "closed" : "dead"}>{deal.status}</Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => archiveDeal(e, deal.id, deal.deal_name)}>
                                  <Archive className="w-4 h-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => deleteDeal(e, deal.id, deal.deal_name)} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {companyToDelete?.companyName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this company and remove it from {companyToDelete?.deals.length} buyer universe{companyToDelete?.deals.length !== 1 ? 's' : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCompany} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}