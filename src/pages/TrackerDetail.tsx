import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CSVImport } from "@/components/CSVImport";
import { DealCSVImport } from "@/components/DealCSVImport";
import { StructuredCriteriaPanel } from "@/components/StructuredCriteriaPanel";
import { Loader2, Plus, ArrowLeft, Search, FileText, Users, ExternalLink, Building2, ArrowUpDown, Trash2, MapPin, Sparkles, Archive, Pencil, Check, X, Info, Wand2, DollarSign, Briefcase, ChevronRight, ChevronDown, Target, FileSearch, Download, MoreHorizontal, Upload } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { IntelligenceBadge } from "@/components/IntelligenceBadge";
import { DealScoreBadge } from "@/components/DealScoreBadge";
import { deleteBuyerWithRelated, deleteDealWithRelated } from "@/lib/cascadeDelete";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function TrackerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tracker, setTracker] = useState<any>(null);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newBuyer, setNewBuyer] = useState({ pe_firm_name: "", pe_firm_website: "", platform_company_name: "", platform_website: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [enrichingBuyers, setEnrichingBuyers] = useState<Set<string>>(new Set());
  const [isBulkEnriching, setIsBulkEnriching] = useState(false);
  const [enrichingDeals, setEnrichingDeals] = useState<Set<string>>(new Set());
  const [isBulkEnrichingDeals, setIsBulkEnrichingDeals] = useState(false);
  const [dealEnrichmentProgress, setDealEnrichmentProgress] = useState({ current: 0, total: 0 });
  const [dealBuyerCounts, setDealBuyerCounts] = useState<Record<string, { approved: number; interested: number; passed: number }>>({});
  const [isEditingFitCriteria, setIsEditingFitCriteria] = useState(false);
  const [editedSizeCriteria, setEditedSizeCriteria] = useState("");
  const [editedServiceCriteria, setEditedServiceCriteria] = useState("");
  const [editedGeographyCriteria, setEditedGeographyCriteria] = useState("");
  const [editedBuyerTypesCriteria, setEditedBuyerTypesCriteria] = useState("");
  const [isSavingFitCriteria, setIsSavingFitCriteria] = useState(false);
  const [isParsingCriteria, setIsParsingCriteria] = useState(false);
  const [isAnalyzingDocuments, setIsAnalyzingDocuments] = useState(false);
  const [isCriteriaCollapsed, setIsCriteriaCollapsed] = useState(true);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const [trackerRes, buyersRes, dealsRes] = await Promise.all([
      supabase.from("industry_trackers").select("*").eq("id", id).single(),
      supabase.from("buyers").select("*").eq("tracker_id", id).order("pe_firm_name"),
      supabase.from("deals").select("*").eq("tracker_id", id).order("created_at", { ascending: false }),
    ]);
    setTracker(trackerRes.data);
    setBuyers(buyersRes.data || []);
    setDeals(dealsRes.data || []);
    
    // Fetch buyer counts for each deal
    if (dealsRes.data && dealsRes.data.length > 0) {
      const dealIds = dealsRes.data.map(d => d.id);
      const { data: scores } = await supabase
        .from("buyer_deal_scores")
        .select("deal_id, selected_for_outreach, interested, passed_on_deal")
        .in("deal_id", dealIds);
      
      if (scores) {
        const counts: Record<string, { approved: number; interested: number; passed: number }> = {};
        dealIds.forEach(dealId => {
          const dealScores = scores.filter(s => s.deal_id === dealId);
          counts[dealId] = {
            approved: dealScores.filter(s => s.selected_for_outreach).length,
            interested: dealScores.filter(s => s.interested).length,
            passed: dealScores.filter(s => s.passed_on_deal).length,
          };
        });
        setDealBuyerCounts(counts);
      }
    }
    
    setIsLoading(false);
  };

  const addBuyer = async () => {
    if (!newBuyer.pe_firm_name.trim()) return;
    const { error } = await supabase.from("buyers").insert({ tracker_id: id, ...newBuyer });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Buyer added" });
    setNewBuyer({ pe_firm_name: "", pe_firm_website: "", platform_company_name: "", platform_website: "" });
    setDialogOpen(false);
    loadData();
  };

  const deleteBuyer = async (buyerId: string, buyerName: string) => {
    const { error } = await deleteBuyerWithRelated(buyerId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Buyer deleted", description: `${buyerName} has been removed` });
    loadData();
  };

  const deleteDeal = async (dealId: string, dealName: string) => {
    const { error } = await deleteDealWithRelated(dealId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deal deleted", description: `${dealName} has been removed` });
    loadData();
  };

  const archiveDeal = async (dealId: string, dealName: string) => {
    const { error } = await supabase.from("deals").update({ status: "Archived" }).eq("id", dealId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deal archived", description: `${dealName} has been archived` });
    loadData();
  };

  const enrichBuyer = async (buyerId: string, buyerName: string) => {
    setEnrichingBuyers(prev => new Set(prev).add(buyerId));
    
    try {
      const { data, error } = await supabase.functions.invoke('enrich-buyer', {
        body: { buyerId }
      });

      if (error) {
        toast({ 
          title: "Enrichment failed", 
          description: error.message, 
          variant: "destructive" 
        });
        return;
      }

      if (!data.success) {
        toast({ 
          title: "Enrichment failed", 
          description: data.error || "Unknown error", 
          variant: "destructive" 
        });
        return;
      }

      // Show warning if partial enrichment (some websites failed)
      if (data.warning) {
        toast({ 
          title: "Partial enrichment", 
          description: data.warning
        });
      } else {
        toast({ 
          title: "Buyer enriched", 
          description: `${buyerName}: ${data.message}` 
        });
      }
      
      await loadData();
    } catch (err) {
      toast({ 
        title: "Enrichment failed", 
        description: err instanceof Error ? err.message : "Unknown error", 
        variant: "destructive" 
      });
    } finally {
      setEnrichingBuyers(prev => {
        const next = new Set(prev);
        next.delete(buyerId);
        return next;
      });
    }
  };

  // Constants for retry logic
  const MAX_ENRICHMENT_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;
  const BETWEEN_BUYER_DELAY_MS = 500;

  const isMeaningfulText = (value: unknown) => {
    if (typeof value !== "string") return false;
    const v = value.trim();
    if (!v) return false;
    const lower = v.toLowerCase();
    return ![
      "not specified",
      "n/a",
      "na",
      "unknown",
      "none",
      "tbd",
    ].includes(lower);
  };

  const isActuallyEnriched = (buyer: any) => {
    return (
      isMeaningfulText(buyer.business_summary) ||
      isMeaningfulText(buyer.services_offered) ||
      isMeaningfulText(buyer.thesis_summary) ||
      isMeaningfulText(buyer.strategic_priorities) ||
      (Array.isArray(buyer.portfolio_companies) && buyer.portfolio_companies.length > 0) ||
      (Array.isArray(buyer.target_industries) && buyer.target_industries.length > 0) ||
      (Array.isArray(buyer.recent_acquisitions) && buyer.recent_acquisitions.length > 0)
    );
  };

  const enrichSingleBuyerWithRetry = async (
    buyer: any,
    attempt: number,
    maxAttempts: number
  ): Promise<{ success: boolean; partial?: boolean; reason?: string; fieldsUpdated?: number }> => {
    try {
      const { data, error } = await supabase.functions.invoke("enrich-buyer", {
        body: { buyerId: buyer.id },
      });

      if (error) {
        return { success: false, reason: error.message };
      }

      if (!data?.success) {
        return { success: false, reason: data?.error || "Unknown enrichment error" };
      }

      const fieldsUpdated = Number(data.fieldsUpdated ?? 0);
      if (!Number.isFinite(fieldsUpdated) || fieldsUpdated <= 0) {
        return { success: false, reason: "0 fields updated", fieldsUpdated: 0 };
      }

      return { success: true, partial: !!data.warning, fieldsUpdated };
    } catch (e) {
      return { success: false, reason: e instanceof Error ? e.message : "Unknown error" };
    }
  };

  const enrichAllBuyers = async () => {
    const buyersWithWebsites = buyers.filter((b) => b.platform_website || b.pe_firm_website);

    if (buyersWithWebsites.length === 0) {
      toast({
        title: "No websites to scrape",
        description: "Add website URLs to buyers first",
        variant: "destructive",
      });
      return;
    }

    setIsBulkEnriching(true);

    const enrichedBuyerIds = new Set<string>();
    const partialBuyerIds = new Set<string>();
    let failedBuyerIds = new Set<string>();
    const failureReasons = new Map<string, string>();

    try {
      // Phase 1: Initial enrichment pass
      toast({
        title: "Starting enrichment",
        description: `Processing ${buyersWithWebsites.length} buyers...`,
      });

      for (let i = 0; i < buyersWithWebsites.length; i++) {
        const buyer = buyersWithWebsites[i];
        setEnrichingBuyers((prev) => new Set(prev).add(buyer.id));

        const result = await enrichSingleBuyerWithRetry(buyer, 1, MAX_ENRICHMENT_RETRIES);

        if (!result.success) {
          failedBuyerIds.add(buyer.id);
          if (result.reason) failureReasons.set(buyer.id, result.reason);
        } else {
          enrichedBuyerIds.add(buyer.id);
          if (result.partial) partialBuyerIds.add(buyer.id);
        }

        setEnrichingBuyers((prev) => {
          const next = new Set(prev);
          next.delete(buyer.id);
          return next;
        });

        if (i < buyersWithWebsites.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, BETWEEN_BUYER_DELAY_MS));
        }
      }

      // Phase 2: Retry failed buyers with exponential backoff
      let retryAttempt = 1;
      while (failedBuyerIds.size > 0 && retryAttempt <= MAX_ENRICHMENT_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryAttempt - 1);
        toast({
          title: `Retry attempt ${retryAttempt} of ${MAX_ENRICHMENT_RETRIES}`,
          description: `Retrying ${failedBuyerIds.size} buyer(s)...`,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));

        const buyersToRetry = buyersWithWebsites.filter((b) => failedBuyerIds.has(b.id));

        for (const buyer of buyersToRetry) {
          setEnrichingBuyers((prev) => new Set(prev).add(buyer.id));

          const result = await enrichSingleBuyerWithRetry(buyer, retryAttempt, MAX_ENRICHMENT_RETRIES);

          if (result.success) {
            failedBuyerIds.delete(buyer.id);
            failureReasons.delete(buyer.id);
            enrichedBuyerIds.add(buyer.id);
            if (result.partial) partialBuyerIds.add(buyer.id);
          } else {
            if (result.reason) failureReasons.set(buyer.id, result.reason);
          }

          setEnrichingBuyers((prev) => {
            const next = new Set(prev);
            next.delete(buyer.id);
            return next;
          });

          await new Promise((resolve) => setTimeout(resolve, BETWEEN_BUYER_DELAY_MS));
        }

        retryAttempt++;
      }

      // Phase 3: Reload data and retry only buyers that still aren't actually enriched
      await new Promise((resolve) => setTimeout(resolve, 800));

      const { data: refreshedBuyers, error: refreshError } = await supabase
        .from("buyers")
        .select("*")
        .eq("tracker_id", id)
        .order("pe_firm_name");

      if (!refreshError && refreshedBuyers) {
        const stillUnenriched = refreshedBuyers.filter(
          (b) => (b.platform_website || b.pe_firm_website) && !isActuallyEnriched(b)
        );

        if (stillUnenriched.length > 0) {
          toast({
            title: "Final verification pass",
            description: `Retrying ${stillUnenriched.length} buyer(s) that still look empty...`,
          });

          for (const buyer of stillUnenriched) {
            setEnrichingBuyers((prev) => new Set(prev).add(buyer.id));

            const result = await enrichSingleBuyerWithRetry(buyer, 1, 1);

            if (result.success) {
              enrichedBuyerIds.add(buyer.id);
              failedBuyerIds.delete(buyer.id);
              failureReasons.delete(buyer.id);
              if (result.partial) partialBuyerIds.add(buyer.id);
            } else {
              failedBuyerIds.add(buyer.id);
              if (result.reason) failureReasons.set(buyer.id, result.reason);
            }

            setEnrichingBuyers((prev) => {
              const next = new Set(prev);
              next.delete(buyer.id);
              return next;
            });

            await new Promise((resolve) => setTimeout(resolve, BETWEEN_BUYER_DELAY_MS));
          }
        }
      }

      await loadData();

      // Summary
      const failed = buyersWithWebsites
        .filter((b) => failedBuyerIds.has(b.id))
        .map((b) => ({
          id: b.id,
          name: b.platform_company_name || b.pe_firm_name,
          reason: failureReasons.get(b.id) || "Unknown",
        }));

      let description = `${enrichedBuyerIds.size} enriched`;
      if (partialBuyerIds.size > 0) description += ` (${partialBuyerIds.size} partial)`;
      if (failed.length > 0) {
        const top = failed.slice(0, 3).map((f) => `${f.name} (${f.reason})`).join(", ");
        description += `, ${failed.length} failed`;
        if (top) description += `: ${top}`;
      }

      toast({ title: "Bulk enrichment complete", description });
    } finally {
      setIsBulkEnriching(false);
      setEnrichingBuyers(new Set());
    }
  };

  const filteredBuyers = buyers.filter((b) =>
    b.pe_firm_name.toLowerCase().includes(search.toLowerCase()) ||
    (b.platform_company_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const getWebsiteUrl = (url: string | null) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `https://${url}`;
  };

  const getHQ = (buyer: any) => {
    if (buyer.hq_city && buyer.hq_state) return `${buyer.hq_city}, ${buyer.hq_state}`;
    if (buyer.hq_state) return buyer.hq_state;
    if (buyer.hq_city) return buyer.hq_city;
    return null;
  };

  const getDescription = (buyer: any) => {
    return buyer.business_summary || buyer.services_offered || null;
  };

  const hasWebsite = (buyer: any) => buyer.platform_website || buyer.pe_firm_website;

  const canEnrichDeal = (deal: any) => deal.transcript_link || deal.additional_info || deal.company_website;

  const isDealEnriched = (deal: any) => {
    return (
      isMeaningfulText(deal.company_overview) ||
      isMeaningfulText(deal.service_mix) ||
      isMeaningfulText(deal.business_model) ||
      (deal.revenue && deal.revenue > 0) ||
      (deal.ebitda_percentage && deal.ebitda_percentage > 0) ||
      (Array.isArray(deal.geography) && deal.geography.length > 0)
    );
  };

  const enrichDeal = async (dealId: string, dealName: string) => {
    setEnrichingDeals(prev => new Set(prev).add(dealId));
    
    try {
      const deal = deals.find(d => d.id === dealId);
      if (!deal) return;

      let enriched = false;

      // 1. Try transcript first (highest priority)
      if (deal.transcript_link) {
        try {
          const { error } = await supabase.functions.invoke('extract-deal-transcript', { 
            body: { dealId } 
          });
          if (!error) enriched = true;
        } catch (e) {
          console.error('Transcript extraction failed:', e);
        }
      }

      // 2. Try notes (medium priority)
      if (deal.additional_info) {
        try {
          const { error } = await supabase.functions.invoke('analyze-deal-notes', { 
            body: { dealId, notes: deal.additional_info } 
          });
          if (!error) enriched = true;
        } catch (e) {
          console.error('Notes analysis failed:', e);
        }
      }

      // 3. Try website (fallback)
      if (deal.company_website) {
        try {
          const { error } = await supabase.functions.invoke('enrich-deal', { 
            body: { dealId, onlyFillEmpty: true } 
          });
          if (!error) enriched = true;
        } catch (e) {
          console.error('Website enrichment failed:', e);
        }
      }

      if (enriched) {
        toast({ title: "Deal enriched", description: dealName });
      } else {
        toast({ title: "Enrichment failed", description: "No data sources available", variant: "destructive" });
      }
      
      await loadData();
    } catch (err) {
      toast({ 
        title: "Enrichment failed", 
        description: err instanceof Error ? err.message : "Unknown error", 
        variant: "destructive" 
      });
    } finally {
      setEnrichingDeals(prev => {
        const next = new Set(prev);
        next.delete(dealId);
        return next;
      });
    }
  };

  const enrichAllDeals = async () => {
    const enrichableDeals = deals.filter(canEnrichDeal);

    if (enrichableDeals.length === 0) {
      toast({
        title: "No deals to enrich",
        description: "Add transcripts, notes, or websites to deals first",
        variant: "destructive",
      });
      return;
    }

    setIsBulkEnrichingDeals(true);
    setDealEnrichmentProgress({ current: 0, total: enrichableDeals.length });
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < enrichableDeals.length; i++) {
      const deal = enrichableDeals[i];
      setDealEnrichmentProgress({ current: i + 1, total: enrichableDeals.length });
      setEnrichingDeals(prev => new Set(prev).add(deal.id));
      
      try {
        let enriched = false;

        if (deal.transcript_link) {
          try {
            const { error } = await supabase.functions.invoke('extract-deal-transcript', { 
              body: { dealId: deal.id } 
            });
            if (!error) enriched = true;
          } catch (e) {
            console.error('Transcript extraction failed:', e);
          }
        }

        if (deal.additional_info) {
          try {
            const { error } = await supabase.functions.invoke('analyze-deal-notes', { 
              body: { dealId: deal.id, notes: deal.additional_info } 
            });
            if (!error) enriched = true;
          } catch (e) {
            console.error('Notes analysis failed:', e);
          }
        }

        if (deal.company_website) {
          try {
            const { error } = await supabase.functions.invoke('enrich-deal', { 
              body: { dealId: deal.id, onlyFillEmpty: true } 
            });
            if (!error) enriched = true;
          } catch (e) {
            console.error('Website enrichment failed:', e);
          }
        }

        if (enriched) successCount++;
        else failCount++;
      } catch (err) {
        failCount++;
        console.error('Error enriching deal:', deal.deal_name, err);
      }

      setEnrichingDeals(prev => {
        const next = new Set(prev);
        next.delete(deal.id);
        return next;
      });

      // Small delay between deals
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await loadData();
    setDealEnrichmentProgress({ current: 0, total: 0 });
    setIsBulkEnrichingDeals(false);

    toast({ 
      title: "Deal enrichment complete", 
      description: `Successfully enriched ${successCount} of ${enrichableDeals.length} deals${failCount > 0 ? `. ${failCount} failed.` : '.'}` 
    });
  };
  

  const startEditingFitCriteria = () => {
    setEditedSizeCriteria(tracker?.fit_criteria_size || "");
    setEditedServiceCriteria(tracker?.fit_criteria_service || "");
    setEditedGeographyCriteria(tracker?.fit_criteria_geography || "");
    setEditedBuyerTypesCriteria(tracker?.fit_criteria_buyer_types || "");
    setIsEditingFitCriteria(true);
  };

  const cancelEditingFitCriteria = () => {
    setIsEditingFitCriteria(false);
    setEditedSizeCriteria("");
    setEditedServiceCriteria("");
    setEditedGeographyCriteria("");
    setEditedBuyerTypesCriteria("");
  };

  const saveFitCriteria = async () => {
    setIsSavingFitCriteria(true);
    const { error } = await supabase
      .from("industry_trackers")
      .update({ 
        fit_criteria_size: editedSizeCriteria,
        fit_criteria_service: editedServiceCriteria,
        fit_criteria_geography: editedGeographyCriteria,
        fit_criteria_buyer_types: editedBuyerTypesCriteria,
        updated_at: new Date().toISOString() 
      })
      .eq("id", id);
    
    if (error) {
      toast({ title: "Error", description: "Failed to save fit criteria", variant: "destructive" });
    } else {
      toast({ title: "Fit criteria updated" });
      setTracker({ 
        ...tracker, 
        fit_criteria_size: editedSizeCriteria,
        fit_criteria_service: editedServiceCriteria,
        fit_criteria_geography: editedGeographyCriteria,
        fit_criteria_buyer_types: editedBuyerTypesCriteria
      });
      setIsEditingFitCriteria(false);
    }
    setIsSavingFitCriteria(false);
  };

  const parseFitCriteria = async () => {
    // Use the original fit_criteria text if structured fields are empty, otherwise combine structured fields
    let criteriaText = tracker?.fit_criteria || '';
    
    if (isEditingFitCriteria) {
      criteriaText = `Size Criteria: ${editedSizeCriteria}\n\nService/Product Criteria: ${editedServiceCriteria}\n\nGeography Criteria: ${editedGeographyCriteria}\n\nBuyer Types: ${editedBuyerTypesCriteria}`;
    } else if (tracker?.fit_criteria_size || tracker?.fit_criteria_service || tracker?.fit_criteria_geography || tracker?.fit_criteria_buyer_types) {
      criteriaText = `Size Criteria: ${tracker?.fit_criteria_size || ''}\n\nService/Product Criteria: ${tracker?.fit_criteria_service || ''}\n\nGeography Criteria: ${tracker?.fit_criteria_geography || ''}\n\nBuyer Types: ${tracker?.fit_criteria_buyer_types || ''}`;
    }
    
    if (!criteriaText.trim() || criteriaText === 'Size Criteria: \n\nService/Product Criteria: \n\nGeography Criteria: \n\nBuyer Types: ') {
      toast({ title: "No criteria to parse", description: "Please add fit criteria text first", variant: "destructive" });
      return;
    }

    setIsParsingCriteria(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-fit-criteria', {
        body: { fit_criteria: criteriaText }
      });

      if (error) {
        toast({ title: "Parsing failed", description: error.message, variant: "destructive" });
        return;
      }

      if (!data.success) {
        toast({ title: "Parsing failed", description: data.error || "Unknown error", variant: "destructive" });
        return;
      }

      // Update the tracker with structured criteria
      const { error: updateError } = await supabase
        .from("industry_trackers")
        .update({
          size_criteria: data.size_criteria,
          service_criteria: data.service_criteria,
          geography_criteria: data.geography_criteria,
          buyer_types_criteria: data.buyer_types_criteria,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (updateError) {
        toast({ title: "Failed to save", description: updateError.message, variant: "destructive" });
        return;
      }

      setTracker({
        ...tracker,
        size_criteria: data.size_criteria,
        service_criteria: data.service_criteria,
        geography_criteria: data.geography_criteria,
        buyer_types_criteria: data.buyer_types_criteria
      });

      toast({ title: "Criteria parsed", description: "Structured criteria extracted successfully" });
    } catch (err) {
      toast({ title: "Parsing failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsParsingCriteria(false);
    }
  };

  const analyzeDocuments = async () => {
    const documents = tracker?.documents as { name: string; path: string; size: number }[] | null;
    if (!documents || documents.length === 0) {
      toast({ title: "No documents", description: "Upload documents first to analyze them", variant: "destructive" });
      return;
    }

    setIsAnalyzingDocuments(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-tracker-documents', {
        body: { tracker_id: id }
      });

      if (error) {
        toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
        return;
      }

      if (!data.success) {
        toast({ title: "Analysis failed", description: data.error || "Unknown error", variant: "destructive" });
        return;
      }

      setTracker({
        ...tracker,
        size_criteria: data.size_criteria,
        service_criteria: data.service_criteria,
        geography_criteria: data.geography_criteria,
        buyer_types_criteria: data.buyer_types_criteria,
        documents_analyzed_at: new Date().toISOString()
      });

      toast({ 
        title: "Documents analyzed", 
        description: `Extracted criteria from ${data.documents_processed} document(s)` 
      });
    } catch (err) {
      toast({ title: "Analysis failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsAnalyzingDocuments(false);
    }
  };

  const getDocumentDownloadUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from('tracker-documents')
      .createSignedUrl(path, 3600); // 1 hour expiry
    return data?.signedUrl;
  };

  const downloadDocument = async (doc: { name: string; path: string }) => {
    const url = await getDocumentDownloadUrl(doc.path);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast({ title: "Error", description: "Could not generate download link", variant: "destructive" });
    }
  };

  const uploadDocuments = async (files: FileList) => {
    setIsUploadingDocs(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to upload documents", variant: "destructive" });
      setIsUploadingDocs(false);
      return;
    }

    const existingDocs = (tracker?.documents as { name: string; path: string; size: number }[]) || [];
    const newDocs = [...existingDocs];

    for (const file of Array.from(files)) {
      const timestamp = Date.now();
      const filePath = `${user.id}/${timestamp}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tracker-documents')
        .upload(filePath, file);

      if (uploadError) {
        toast({ title: "Upload failed", description: `${file.name}: ${uploadError.message}`, variant: "destructive" });
        continue;
      }

      newDocs.push({ name: file.name, path: filePath, size: file.size });
    }

    const { error: updateError } = await supabase
      .from('industry_trackers')
      .update({ documents: newDocs, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      toast({ title: "Error", description: "Failed to save document list", variant: "destructive" });
    } else {
      setTracker({ ...tracker, documents: newDocs });
      toast({ title: "Documents uploaded", description: `${files.length} file(s) added` });
    }

    setIsUploadingDocs(false);
  };

  const removeDocument = async (doc: { name: string; path: string }) => {
    const { error: deleteError } = await supabase.storage
      .from('tracker-documents')
      .remove([doc.path]);

    if (deleteError) {
      toast({ title: "Error", description: `Failed to delete ${doc.name}`, variant: "destructive" });
      return;
    }

    const existingDocs = (tracker?.documents as { name: string; path: string; size: number }[]) || [];
    const updatedDocs = existingDocs.filter(d => d.path !== doc.path);

    const { error: updateError } = await supabase
      .from('industry_trackers')
      .update({ documents: updatedDocs, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      toast({ title: "Error", description: "Failed to update document list", variant: "destructive" });
    } else {
      setTracker({ ...tracker, documents: updatedDocs });
      toast({ title: "Document removed", description: doc.name });
    }
  };

  if (isLoading) return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  if (!tracker) return <AppLayout><div className="text-center py-12">Tracker not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/trackers")}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">{tracker.industry_name}</h1>
            <p className="text-muted-foreground">{buyers.length} buyers · {deals.length} deals</p>
          </div>
          <Button onClick={() => navigate(`/trackers/${id}/deals/new`)}><Plus className="w-4 h-4 mr-2" />List New Deal</Button>
        </div>

        {/* Fit Criteria Section */}
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-start justify-between gap-4">
            <button 
              onClick={() => !isEditingFitCriteria && setIsCriteriaCollapsed(!isCriteriaCollapsed)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              disabled={isEditingFitCriteria}
            >
              {isCriteriaCollapsed ? (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
              <Info className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Buyer Fit Criteria</h3>
            </button>
            {!isEditingFitCriteria && (
              <Button variant="ghost" size="sm" onClick={startEditingFitCriteria}>
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>
          
          {!isCriteriaCollapsed && (isEditingFitCriteria ? (
            <div className="mt-3 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    Size Criteria
                  </Label>
                  <Textarea
                    value={editedSizeCriteria}
                    onChange={(e) => setEditedSizeCriteria(e.target.value)}
                    placeholder="Revenue thresholds, EBITDA ranges, employee count, location count, sq ft requirements..."
                    className="min-h-[100px] text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    Service/Product Mix
                  </Label>
                  <Textarea
                    value={editedServiceCriteria}
                    onChange={(e) => setEditedServiceCriteria(e.target.value)}
                    placeholder="Required services, preferred capabilities, excluded services, business model preferences..."
                    className="min-h-[100px] text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    Geography
                  </Label>
                  <Textarea
                    value={editedGeographyCriteria}
                    onChange={(e) => setEditedGeographyCriteria(e.target.value)}
                    placeholder="Target regions, excluded areas, coverage type, HQ requirements..."
                    className="min-h-[100px] text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-primary" />
                    Buyer Types
                  </Label>
                  <Textarea
                    value={editedBuyerTypesCriteria}
                    onChange={(e) => setEditedBuyerTypesCriteria(e.target.value)}
                    placeholder="Large MSOs: National presence, 3+ locations, $2M+ per location...

Regional MSOs: 6-50 locations, 7,500+ sq ft, $1.2M+/location...

PE Platforms: New platform seekers, $1.5M-3M EBITDA..."
                    className="min-h-[100px] text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={cancelEditingFitCriteria} disabled={isSavingFitCriteria || isParsingCriteria}>
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
                <Button variant="outline" size="sm" onClick={parseFitCriteria} disabled={isParsingCriteria || isSavingFitCriteria}>
                  {isParsingCriteria ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5 mr-1" />
                  )}
                  Parse Criteria
                </Button>
                <Button size="sm" onClick={saveFitCriteria} disabled={isSavingFitCriteria || isParsingCriteria}>
                  {isSavingFitCriteria ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Show structured criteria if available */}
              {(tracker.size_criteria || tracker.service_criteria || tracker.geography_criteria || tracker.buyer_types_criteria) ? (
                <>
                  <StructuredCriteriaPanel
                    sizeCriteria={tracker.size_criteria}
                    serviceCriteria={tracker.service_criteria}
                    geographyCriteria={tracker.geography_criteria}
                    buyerTypesCriteria={tracker.buyer_types_criteria}
                  />
                  {/* Show raw text in collapsible if it exists */}
                  {(tracker.fit_criteria || tracker.fit_criteria_size || tracker.fit_criteria_service || tracker.fit_criteria_geography || tracker.fit_criteria_buyer_types) && (
                    <Collapsible defaultOpen={false} className="mt-4">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                          <ChevronRight className="w-4 h-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
                          View Source Text
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="bg-muted/20 rounded-lg p-3 border mt-2 text-xs text-muted-foreground">
                          {tracker.fit_criteria && (
                            <p className="whitespace-pre-wrap">{tracker.fit_criteria}</p>
                          )}
                          {(tracker.fit_criteria_size || tracker.fit_criteria_service || tracker.fit_criteria_geography || tracker.fit_criteria_buyer_types) && (
                            <div className="grid grid-cols-2 gap-3 mt-2">
                              {tracker.fit_criteria_size && <div><strong>Size:</strong> {tracker.fit_criteria_size}</div>}
                              {tracker.fit_criteria_service && <div><strong>Service:</strong> {tracker.fit_criteria_service}</div>}
                              {tracker.fit_criteria_geography && <div><strong>Geography:</strong> {tracker.fit_criteria_geography}</div>}
                              {tracker.fit_criteria_buyer_types && <div><strong>Buyer Types:</strong> {tracker.fit_criteria_buyer_types}</div>}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </>
              ) : (tracker.fit_criteria || tracker.fit_criteria_size || tracker.fit_criteria_service || tracker.fit_criteria_geography || tracker.fit_criteria_buyer_types) ? (
                <>
                  {/* Show raw criteria with parse button */}
                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={parseFitCriteria} disabled={isParsingCriteria}>
                      {isParsingCriteria ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5 mr-1" />
                      )}
                      Parse into Structured Criteria
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {tracker.fit_criteria_size && (
                      <div className="bg-muted/30 rounded-lg p-3 border">
                        <div className="flex items-center gap-1.5 mb-2">
                          <DollarSign className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-medium">Size</span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tracker.fit_criteria_size}</p>
                      </div>
                    )}
                    {tracker.fit_criteria_service && (
                      <div className="bg-muted/30 rounded-lg p-3 border">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Briefcase className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-medium">Service/Product Mix</span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tracker.fit_criteria_service}</p>
                      </div>
                    )}
                    {tracker.fit_criteria_geography && (
                      <div className="bg-muted/30 rounded-lg p-3 border">
                        <div className="flex items-center gap-1.5 mb-2">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-medium">Geography</span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tracker.fit_criteria_geography}</p>
                      </div>
                    )}
                    {tracker.fit_criteria_buyer_types && (
                      <div className="bg-muted/30 rounded-lg p-3 border">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Target className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-medium">Buyer Types</span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tracker.fit_criteria_buyer_types}</p>
                      </div>
                    )}
                  </div>
                  {tracker.fit_criteria && !tracker.fit_criteria_size && !tracker.fit_criteria_service && !tracker.fit_criteria_geography && !tracker.fit_criteria_buyer_types && (
                    <div className="bg-muted/30 rounded-lg p-3 border mt-3">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tracker.fit_criteria}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground italic">
                  No fit criteria defined. Click Edit to add criteria that will guide buyer matching.
                </p>
              )}
            </>
          ))}
          
          
          {/* Documents Section */}
          {!isCriteriaCollapsed && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Supporting Documents</span>
                  {tracker.documents && (tracker.documents as any[]).length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {(tracker.documents as any[]).length}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {tracker.documents_analyzed_at && (
                    <span className="text-xs text-muted-foreground">
                      Analyzed {new Date(tracker.documents_analyzed_at).toLocaleDateString()}
                    </span>
                  )}
                  <input
                    type="file"
                    ref={docFileInputRef}
                    onChange={(e) => e.target.files && uploadDocuments(e.target.files)}
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => docFileInputRef.current?.click()}
                    disabled={isUploadingDocs}
                  >
                    {isUploadingDocs ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 mr-1" />
                    )}
                    Add Documents
                  </Button>
                  {tracker.documents && (tracker.documents as any[]).length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={analyzeDocuments}
                      disabled={isAnalyzingDocuments}
                    >
                      {isAnalyzingDocuments ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <FileSearch className="w-3.5 h-3.5 mr-1" />
                      )}
                      {tracker.documents_analyzed_at ? 'Re-analyze' : 'Analyze'}
                    </Button>
                  )}
                </div>
              </div>
              {tracker.documents && (tracker.documents as any[]).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(tracker.documents as { name: string; path: string; size: number }[]).map((doc, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md text-sm group"
                    >
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">{doc.name}</span>
                      <button
                        onClick={() => downloadDocument(doc)}
                        className="p-0.5 hover:bg-muted rounded transition-colors"
                        title="Download"
                      >
                        <Download className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => removeDocument(doc)}
                        className="p-0.5 hover:bg-destructive/20 rounded transition-colors"
                        title="Remove"
                      >
                        <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No documents uploaded. Add documents to analyze and extract criteria.
                </p>
              )}
            </div>
          )}
        </div>

        <Tabs defaultValue="buyers">
          <TabsList><TabsTrigger value="buyers"><Users className="w-4 h-4 mr-2" />Buyers ({buyers.length})</TabsTrigger><TabsTrigger value="deals"><FileText className="w-4 h-4 mr-2" />Deals ({deals.length})</TabsTrigger></TabsList>
          
          <TabsContent value="buyers" className="mt-4 space-y-4">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search buyers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      onClick={enrichAllBuyers}
                      disabled={isBulkEnriching || buyers.filter(hasWebsite).length === 0}
                    >
                      {isBulkEnriching ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Enrich All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Scrape websites and extract data for all buyers</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <CSVImport trackerId={id!} onComplete={loadData} />
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Buyer</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Buyer</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div><Label>PE Firm Name *</Label><Input value={newBuyer.pe_firm_name} onChange={(e) => setNewBuyer({ ...newBuyer, pe_firm_name: e.target.value })} placeholder="e.g., Blackstone" className="mt-1" /></div>
                    <div><Label>PE Firm Website</Label><Input value={newBuyer.pe_firm_website} onChange={(e) => setNewBuyer({ ...newBuyer, pe_firm_website: e.target.value })} placeholder="e.g., https://blackstone.com" className="mt-1" /></div>
                    <div><Label>Platform Company</Label><Input value={newBuyer.platform_company_name} onChange={(e) => setNewBuyer({ ...newBuyer, platform_company_name: e.target.value })} placeholder="e.g., ABC Services" className="mt-1" /></div>
                    <div><Label>Platform Company Website</Label><Input value={newBuyer.platform_website} onChange={(e) => setNewBuyer({ ...newBuyer, platform_website: e.target.value })} placeholder="e.g., https://abcservices.com" className="mt-1" /></div>
                    <Button onClick={addBuyer} disabled={!newBuyer.pe_firm_name.trim()} className="w-full">Add Buyer</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="bg-card rounded-lg border overflow-hidden">
              {filteredBuyers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {search ? "No buyers match your search" : "No buyers yet. Add buyers manually or import from CSV."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[220px]">
                        <div className="flex items-center gap-1">Platform Company <ArrowUpDown className="w-3 h-3 text-muted-foreground" /></div>
                      </TableHead>
                      <TableHead className="w-[180px]">
                        <div className="flex items-center gap-1">PE Firm <ArrowUpDown className="w-3 h-3 text-muted-foreground" /></div>
                      </TableHead>
                      <TableHead className="w-[300px]">Description</TableHead>
                      <TableHead className="w-[120px] text-center">Intelligence</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBuyers.map((buyer) => (
                      <TableRow 
                        key={buyer.id} 
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => navigate(`/buyers/${buyer.id}`)}
                      >
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{buyer.platform_company_name || buyer.pe_firm_name}</span>
                              {buyer.platform_website ? (
                                <a 
                                  href={getWebsiteUrl(buyer.platform_website)!} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-primary hover:text-primary/80"
                                  title="Visit website"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground/40" title="Website not set">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              {isActuallyEnriched(buyer) && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Enriched
                                </Badge>
                              )}
                              {(buyer.has_fee_agreement || (buyer.fee_agreement_status && buyer.fee_agreement_status !== 'None')) && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                  <DollarSign className="w-3 h-3 mr-1" />
                                  Fee Agreed
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {getHQ(buyer) || <span className="italic">Location not set</span>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            {buyer.pe_firm_website ? (
                              <a 
                                href={getWebsiteUrl(buyer.pe_firm_website)!} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                {buyer.pe_firm_name}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span>{buyer.pe_firm_name}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground line-clamp-3">{getDescription(buyer) || "—"}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <IntelligenceBadge buyer={buyer} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      enrichBuyer(buyer.id, buyer.platform_company_name || buyer.pe_firm_name);
                                    }}
                                    disabled={enrichingBuyers.has(buyer.id) || !hasWebsite(buyer)}
                                  >
                                    {enrichingBuyers.has(buyer.id) ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{hasWebsite(buyer) ? "Enrich with AI" : "No website to scrape"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Buyer</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {buyer.platform_company_name || buyer.pe_firm_name}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteBuyer(buyer.id, buyer.platform_company_name || buyer.pe_firm_name)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="deals" className="mt-4 space-y-4">
            <div className="flex justify-end gap-2 mb-2">
              <Button 
                variant="outline" 
                onClick={enrichAllDeals}
                disabled={isBulkEnrichingDeals || deals.length === 0}
              >
                {isBulkEnrichingDeals ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enriching {dealEnrichmentProgress.current} of {dealEnrichmentProgress.total}...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Enrich All Deals
                  </>
                )}
              </Button>
              <DealCSVImport trackerId={id!} onComplete={loadData} />
            </div>
            {deals.length === 0 ? (
              <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
                No deals yet. List a deal to match it with buyers.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Deal Name</TableHead>
                    <TableHead className="w-[150px]">Service Area</TableHead>
                    <TableHead className="w-[80px] text-center">Approved</TableHead>
                    <TableHead className="w-[80px] text-center">Interested</TableHead>
                    <TableHead className="w-[80px] text-center">Passed</TableHead>
                    <TableHead className="w-[100px]">Date Added</TableHead>
                    <TableHead className="w-[90px] text-right">Revenue</TableHead>
                    <TableHead className="w-[90px] text-right">EBITDA</TableHead>
                    <TableHead className="w-[90px] text-center">Score</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...deals].sort((a, b) => (b.deal_score || 0) - (a.deal_score || 0)).map((deal) => {
                    const counts = dealBuyerCounts[deal.id] || { approved: 0, interested: 0, passed: 0 };
                    const geographyStr = deal.geography?.join(", ") || "—";
                    const dateAdded = new Date(deal.created_at).toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric", 
                      year: "numeric" 
                    });
                    
                    return (
                      <TableRow key={deal.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Link to={`/deals/${deal.id}`} className="flex items-center gap-2 hover:underline">
                            <span className="font-medium">{deal.deal_name}</span>
                            {isDealEnriched(deal) && (
                              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-200">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Enriched
                              </Badge>
                            )}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{geographyStr}</TableCell>
                        <TableCell className="text-center">
                          {counts.approved > 0 ? (
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                              {counts.approved}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {counts.interested > 0 ? (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                              {counts.interested}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {counts.passed > 0 ? (
                            <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive">
                              {counts.passed}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{dateAdded}</TableCell>
                        <TableCell className="text-right text-sm">
                          {deal.revenue ? `$${deal.revenue}M` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {deal.ebitda_amount ? `$${deal.ebitda_amount.toFixed(1)}M` : deal.ebitda_percentage ? `${deal.ebitda_percentage}%` : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {deal.deal_score ? <DealScoreBadge score={deal.deal_score} size="sm" /> : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant={deal.status === "Active" ? "active" : deal.status === "Closed" ? "closed" : "dead"} className="mr-1">
                              {deal.status}
                            </Badge>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => enrichDeal(deal.id, deal.deal_name)}
                                    disabled={enrichingDeals.has(deal.id) || !canEnrichDeal(deal)}
                                  >
                                    {enrichingDeals.has(deal.id) ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{canEnrichDeal(deal) ? "Enrich deal" : "No data sources to enrich from"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => archiveDeal(deal.id, deal.deal_name)}
                                    disabled={deal.status === "Archived"}
                                  >
                                    <Archive className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{deal.status === "Archived" ? "Already archived" : "Archive deal"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Deal?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{deal.deal_name}" and all related data. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteDeal(deal.id, deal.deal_name)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
