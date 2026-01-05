import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StructuredCriteriaPanel } from "@/components/StructuredCriteriaPanel";
import { KPIConfigPanel } from "@/components/KPIConfigPanel";
import { ScoringBehaviorPanel } from "@/components/ScoringBehaviorPanel";
import { TrackerQueryChat } from "@/components/TrackerQueryChat";
import { TrackerNotesSection } from "@/components/TrackerNotesSection";
import { AIResearchSection } from "@/components/AIResearchSection";
import { Loader2, Plus, ArrowLeft, FileText, Users, Info, Wand2, ChevronRight, ChevronDown, FileSearch, Download, Upload, BookOpen, X, Pencil, Check, Send, MessageSquare, DollarSign, Briefcase, MapPin, Target } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { deleteBuyerWithRelated, deleteDealWithRelated } from "@/lib/cascadeDelete";
import { TrackerBuyersTab } from "@/components/tracker/TrackerBuyersTab";
import { TrackerDealsTab } from "@/components/tracker/TrackerDealsTab";

// LocalStorage key for enrichment progress persistence
const getEnrichmentStorageKey = (trackerId: string) => `enrichment_progress_${trackerId}`;

interface EnrichmentProgress {
  processedIds: string[];
  startedAt: string;
  lastUpdatedAt: string;
}

// Helper functions
const isMeaningfulText = (value: unknown) => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v) return false;
  return !["not specified", "n/a", "na", "unknown", "none", "tbd"].includes(v.toLowerCase());
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

export default function TrackerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Core data state
  const [tracker, setTracker] = useState<any>(null);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [dealBuyerCounts, setDealBuyerCounts] = useState<Record<string, { approved: number; interested: number; passed: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Buyer state
  const [search, setSearch] = useState("");
  const [enrichingBuyers, setEnrichingBuyers] = useState<Set<string>>(new Set());
  const [isBulkEnriching, setIsBulkEnriching] = useState(false);
  const [buyerEnrichmentProgress, setBuyerEnrichmentProgress] = useState({ current: 0, total: 0 });
  const [selectedBuyerIds, setSelectedBuyerIds] = useState<Set<string>>(new Set());
  const [highlightedBuyerIds, setHighlightedBuyerIds] = useState<Set<string>>(new Set());
  const [buyerSortColumn, setBuyerSortColumn] = useState<string>("platform_company_name");
  const [buyerSortDirection, setBuyerSortDirection] = useState<"asc" | "desc">("asc");
  const [hasInterruptedSession, setHasInterruptedSession] = useState(false);
  const [interruptedSessionInfo, setInterruptedSessionInfo] = useState<{ processed: number; remaining: number } | null>(null);
  const [isDeduping, setIsDeduping] = useState(false);
  const [dedupeDialogOpen, setDedupeDialogOpen] = useState(false);
  const [dedupePreview, setDedupePreview] = useState<any>(null);
  
  // Deal state
  const [enrichingDeals, setEnrichingDeals] = useState<Set<string>>(new Set());
  const [isBulkEnrichingDeals, setIsBulkEnrichingDeals] = useState(false);
  const [dealEnrichmentProgress, setDealEnrichmentProgress] = useState({ current: 0, total: 0 });
  const [dealSortColumn, setDealSortColumn] = useState<string>("deal_score");
  const [dealSortDirection, setDealSortDirection] = useState<"asc" | "desc">("desc");
  const [isScoringAll, setIsScoringAll] = useState(false);
  const [scoringProgress, setScoringProgress] = useState({ current: 0, total: 0 });
  
  // Criteria state
  const [isCriteriaCollapsed, setIsCriteriaCollapsed] = useState(true);
  const [isEditingFitCriteria, setIsEditingFitCriteria] = useState(false);
  const [editedSizeCriteria, setEditedSizeCriteria] = useState("");
  const [editedServiceCriteria, setEditedServiceCriteria] = useState("");
  const [editedGeographyCriteria, setEditedGeographyCriteria] = useState("");
  const [editedBuyerTypesCriteria, setEditedBuyerTypesCriteria] = useState("");
  const [isSavingFitCriteria, setIsSavingFitCriteria] = useState(false);
  const [isParsingCriteria, setIsParsingCriteria] = useState(false);
  const [criteriaEditInstruction, setCriteriaEditInstruction] = useState("");
  const [isApplyingCriteriaEdit, setIsApplyingCriteriaEdit] = useState(false);
  const [lastCriteriaChangesSummary, setLastCriteriaChangesSummary] = useState("");
  const [isExtractingFromGuide, setIsExtractingFromGuide] = useState(false);
  
  // Document state
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const [isAnalyzingDocuments, setIsAnalyzingDocuments] = useState(false);
  const [showAnalysisConfirmDialog, setShowAnalysisConfirmDialog] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const autoExtractAttemptedRef = useRef(false);

  // Constants for retry logic
  const MAX_ENRICHMENT_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;
  const BETWEEN_BUYER_DELAY_MS = 500;

  // Navigation warning when bulk enriching
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isBulkEnriching) {
        e.preventDefault();
        e.returnValue = 'Enrichment is in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isBulkEnriching]);

  // Check for interrupted enrichment session on load
  useEffect(() => {
    if (!id || buyers.length === 0) return;
    const storageKey = getEnrichmentStorageKey(id);
    const savedProgress = localStorage.getItem(storageKey);
    if (savedProgress) {
      try {
        const progress: EnrichmentProgress = JSON.parse(savedProgress);
        const buyersWithWebsites = buyers.filter((b) => b.platform_website || b.pe_firm_website);
        const unenrichedBuyers = buyersWithWebsites.filter((b) => !isActuallyEnriched(b));
        if (unenrichedBuyers.length > 0 && progress.processedIds.length > 0) {
          setHasInterruptedSession(true);
          setInterruptedSessionInfo({ processed: progress.processedIds.length, remaining: unenrichedBuyers.length });
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
  }, [id, buyers]);

  useEffect(() => { loadData(); }, [id]);
  
  // Auto-extract criteria from M&A guide
  useEffect(() => {
    if (!tracker || autoExtractAttemptedRef.current || isExtractingFromGuide) return;
    const hasGuide = !!tracker.ma_guide_content;
    const hasStructuredCriteria = tracker.size_criteria || tracker.service_criteria || tracker.geography_criteria || tracker.buyer_types_criteria;
    if (hasGuide && !hasStructuredCriteria) {
      autoExtractAttemptedRef.current = true;
      extractCriteriaFromGuide();
    }
  }, [tracker, isExtractingFromGuide]);

  const loadData = useCallback(async () => {
    const [trackerRes, buyersRes, dealsRes] = await Promise.all([
      supabase.from("industry_trackers").select("*").eq("id", id).single(),
      supabase.from("buyers").select("*").eq("tracker_id", id).order("pe_firm_name"),
      supabase.from("deals").select("*").eq("tracker_id", id).order("created_at", { ascending: false }),
    ]);
    setTracker(trackerRes.data);
    setBuyers(buyersRes.data || []);
    setDeals(dealsRes.data || []);
    
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
  }, [id]);

  // Buyer actions
  const addBuyer = async (newBuyer: { pe_firm_name: string; pe_firm_website: string; platform_company_name: string; platform_website: string }) => {
    if (!newBuyer.pe_firm_name.trim()) return false;
    const { error } = await supabase.from("buyers").insert({ tracker_id: id, ...newBuyer });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return false; }
    toast({ title: "Buyer added" });
    loadData();
    return true;
  };

  const deleteBuyer = async (buyerId: string, buyerName: string) => {
    const { error } = await deleteBuyerWithRelated(buyerId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Buyer deleted", description: `${buyerName} has been removed` });
    loadData();
  };

  const enrichBuyer = async (buyerId: string, buyerName: string) => {
    setEnrichingBuyers(prev => new Set(prev).add(buyerId));
    try {
      const { data, error } = await supabase.functions.invoke('enrich-buyer', { body: { buyerId } });
      if (error || !data?.success) {
        toast({ title: "Enrichment failed", description: error?.message || data?.error || "Unknown error", variant: "destructive" });
        return;
      }
      toast({ title: data.warning ? "Partial enrichment" : "Buyer enriched", description: data.warning || `${buyerName}: ${data.message}` });
      await loadData();
    } catch (err) {
      toast({ title: "Enrichment failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setEnrichingBuyers(prev => { const next = new Set(prev); next.delete(buyerId); return next; });
    }
  };

  const saveEnrichmentProgress = (processedIds: string[]) => {
    if (!id) return;
    localStorage.setItem(getEnrichmentStorageKey(id), JSON.stringify({
      processedIds, startedAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString()
    }));
  };

  const clearEnrichmentProgress = () => {
    if (!id) return;
    localStorage.removeItem(getEnrichmentStorageKey(id));
    setHasInterruptedSession(false);
    setInterruptedSessionInfo(null);
  };

  const enrichSingleBuyerWithRetry = async (buyer: any): Promise<{ success: boolean; partial?: boolean; reason?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke("enrich-buyer", { body: { buyerId: buyer.id } });
      if (error) return { success: false, reason: error.message };
      if (!data?.success || (Number(data.fieldsUpdated ?? 0) <= 0)) return { success: false, reason: data?.error || "0 fields updated" };
      return { success: true, partial: !!data.warning };
    } catch (e) {
      return { success: false, reason: e instanceof Error ? e.message : "Unknown error" };
    }
  };

  const enrichAllBuyers = async () => {
    const buyersWithWebsites = buyers.filter((b) => b.platform_website || b.pe_firm_website);
    const unenrichedBuyers = buyersWithWebsites.filter((b) => !isActuallyEnriched(b));
    if (buyersWithWebsites.length === 0) { toast({ title: "No websites to scrape", description: "Add website URLs to buyers first", variant: "destructive" }); return; }
    if (unenrichedBuyers.length === 0) { toast({ title: "All buyers already enriched" }); clearEnrichmentProgress(); return; }

    setIsBulkEnriching(true);
    setBuyerEnrichmentProgress({ current: 0, total: unenrichedBuyers.length });

    let enrichedCount = 0, failedCount = 0;
    const processedIds: string[] = [];

    for (let i = 0; i < unenrichedBuyers.length; i++) {
      const buyer = unenrichedBuyers[i];
      setEnrichingBuyers(prev => new Set(prev).add(buyer.id));
      setBuyerEnrichmentProgress({ current: i + 1, total: unenrichedBuyers.length });

      const result = await enrichSingleBuyerWithRetry(buyer);
      processedIds.push(buyer.id);
      saveEnrichmentProgress(processedIds);

      if (result.success) enrichedCount++; else failedCount++;
      setEnrichingBuyers(prev => { const next = new Set(prev); next.delete(buyer.id); return next; });
      if (i < unenrichedBuyers.length - 1) await new Promise(r => setTimeout(r, BETWEEN_BUYER_DELAY_MS));
    }

    await loadData();
    toast({ title: "Bulk enrichment complete", description: `${enrichedCount} enriched, ${failedCount} failed` });
    clearEnrichmentProgress();
    setIsBulkEnriching(false);
    setEnrichingBuyers(new Set());
    setBuyerEnrichmentProgress({ current: 0, total: 0 });
  };

  const deleteSelectedBuyers = async () => {
    for (const buyerId of selectedBuyerIds) {
      await deleteBuyerWithRelated(buyerId);
    }
    toast({ title: "Buyers deleted", description: `${selectedBuyerIds.size} buyer(s) removed` });
    setSelectedBuyerIds(new Set());
    setHighlightedBuyerIds(new Set());
    loadData();
  };

  const checkForDuplicates = async () => {
    setIsDeduping(true);
    try {
      const { data, error } = await supabase.functions.invoke('dedupe-buyers', { body: { tracker_id: id, preview_only: true } });
      if (error || !data?.success) { toast({ title: "Error", description: error?.message || data?.error, variant: "destructive" }); return; }
      if (data.stats.groupsFound === 0) { toast({ title: "No duplicates found" }); return; }
      setDedupePreview(data);
      setDedupeDialogOpen(true);
    } finally {
      setIsDeduping(false);
    }
  };

  const executeDedupe = async () => {
    setIsDeduping(true);
    try {
      const { data, error } = await supabase.functions.invoke('dedupe-buyers', { body: { tracker_id: id, preview_only: false } });
      if (error || !data?.success) { toast({ title: "Error", description: error?.message || data?.error, variant: "destructive" }); return; }
      toast({ title: "Duplicates merged", description: `Merged ${data.stats.groupsMerged} groups` });
      setDedupeDialogOpen(false);
      setDedupePreview(null);
      loadData();
    } finally {
      setIsDeduping(false);
    }
  };

  const handleBuyerSort = (column: string) => {
    if (buyerSortColumn === column) setBuyerSortDirection(prev => prev === "asc" ? "desc" : "asc");
    else { setBuyerSortColumn(column); setBuyerSortDirection("asc"); }
  };

  // Deal actions
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

  const enrichDeal = async (dealId: string, dealName: string) => {
    setEnrichingDeals(prev => new Set(prev).add(dealId));
    try {
      const deal = deals.find(d => d.id === dealId);
      if (!deal) return;
      let enriched = false;
      if (deal.transcript_link) { const { error } = await supabase.functions.invoke('extract-deal-transcript', { body: { dealId } }); if (!error) enriched = true; }
      if (deal.additional_info) { const { error } = await supabase.functions.invoke('analyze-deal-notes', { body: { dealId, notes: deal.additional_info, applyToRecord: true } }); if (!error) enriched = true; }
      if (deal.company_website) { const { error } = await supabase.functions.invoke('enrich-deal', { body: { dealId, onlyFillEmpty: true } }); if (!error) enriched = true; }
      toast({ title: enriched ? "Deal enriched" : "Enrichment failed", description: enriched ? dealName : "No data sources available", variant: enriched ? "default" : "destructive" });
      await loadData();
    } finally {
      setEnrichingDeals(prev => { const next = new Set(prev); next.delete(dealId); return next; });
    }
  };

  const enrichAllDeals = async () => {
    const enrichableDeals = deals.filter(d => d.transcript_link || d.additional_info || d.company_website);
    if (enrichableDeals.length === 0) { toast({ title: "No deals to enrich", variant: "destructive" }); return; }
    setIsBulkEnrichingDeals(true);
    setDealEnrichmentProgress({ current: 0, total: enrichableDeals.length });

    for (let i = 0; i < enrichableDeals.length; i++) {
      const deal = enrichableDeals[i];
      setDealEnrichmentProgress({ current: i + 1, total: enrichableDeals.length });
      setEnrichingDeals(prev => new Set(prev).add(deal.id));
      try {
        if (deal.transcript_link) await supabase.functions.invoke('extract-deal-transcript', { body: { dealId: deal.id } });
        if (deal.additional_info) await supabase.functions.invoke('analyze-deal-notes', { body: { dealId: deal.id, notes: deal.additional_info, applyToRecord: true } });
        if (deal.company_website) await supabase.functions.invoke('enrich-deal', { body: { dealId: deal.id, onlyFillEmpty: true } });
      } catch {}
      setEnrichingDeals(prev => { const next = new Set(prev); next.delete(deal.id); return next; });
      await new Promise(r => setTimeout(r, 500));
    }

    await loadData();
    setDealEnrichmentProgress({ current: 0, total: 0 });
    setIsBulkEnrichingDeals(false);
    toast({ title: "Deal enrichment complete" });
  };

  const scoreAllDeals = async () => {
    if (deals.length === 0) return;
    setIsScoringAll(true);
    setScoringProgress({ current: 0, total: deals.length });
    let scored = 0;
    for (const deal of deals) {
      try { await supabase.functions.invoke('score-deal', { body: { dealId: deal.id } }); scored++; } catch {}
      setScoringProgress({ current: scored, total: deals.length });
    }
    await loadData();
    toast({ title: "Scoring complete", description: `${scored} deals scored` });
    setIsScoringAll(false);
  };

  const handleDealSort = (column: string) => {
    if (dealSortColumn === column) setDealSortDirection(prev => prev === "asc" ? "desc" : "asc");
    else { setDealSortColumn(column); setDealSortDirection("desc"); }
  };

  // Criteria actions
  const hasExistingCriteria = () => tracker?.size_criteria || tracker?.service_criteria || tracker?.geography_criteria || tracker?.buyer_types_criteria;

  const extractCriteriaFromGuide = async () => {
    if (!tracker?.ma_guide_content) return;
    setIsExtractingFromGuide(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-fit-criteria', { body: { fit_criteria: tracker.ma_guide_content } });
      if (error || !data?.success) { toast({ title: "Extraction failed", variant: "destructive" }); return; }
      await supabase.from("industry_trackers").update({
        size_criteria: data.size_criteria, service_criteria: data.service_criteria,
        geography_criteria: data.geography_criteria, buyer_types_criteria: data.buyer_types_criteria, updated_at: new Date().toISOString()
      }).eq("id", id);
      setTracker({ ...tracker, size_criteria: data.size_criteria, service_criteria: data.service_criteria, geography_criteria: data.geography_criteria, buyer_types_criteria: data.buyer_types_criteria });
      toast({ title: "Criteria extracted" });
    } finally {
      setIsExtractingFromGuide(false);
    }
  };

  const startEditingFitCriteria = () => {
    let sizeText = tracker?.fit_criteria_size || "";
    let serviceText = tracker?.fit_criteria_service || "";
    let geoText = tracker?.fit_criteria_geography || "";
    let buyerTypesText = tracker?.fit_criteria_buyer_types || "";
    setEditedSizeCriteria(sizeText);
    setEditedServiceCriteria(serviceText);
    setEditedGeographyCriteria(geoText);
    setEditedBuyerTypesCriteria(buyerTypesText);
    setIsEditingFitCriteria(true);
  };

  const cancelEditingFitCriteria = () => {
    setIsEditingFitCriteria(false);
    setEditedSizeCriteria(""); setEditedServiceCriteria(""); setEditedGeographyCriteria(""); setEditedBuyerTypesCriteria("");
    setCriteriaEditInstruction(""); setLastCriteriaChangesSummary("");
  };

  const applyCriteriaEditWithAI = async () => {
    if (!criteriaEditInstruction.trim()) return;
    setIsApplyingCriteriaEdit(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-fit-criteria-chat', {
        body: { instruction: criteriaEditInstruction, currentCriteria: { size: editedSizeCriteria, service: editedServiceCriteria, geography: editedGeographyCriteria, buyerTypes: editedBuyerTypesCriteria } }
      });
      if (error || !data?.success) { toast({ title: "AI update failed", variant: "destructive" }); return; }
      setEditedSizeCriteria(data.updatedCriteria.size);
      setEditedServiceCriteria(data.updatedCriteria.service);
      setEditedGeographyCriteria(data.updatedCriteria.geography);
      setEditedBuyerTypesCriteria(data.updatedCriteria.buyerTypes);
      setLastCriteriaChangesSummary(data.changesSummary);
      setCriteriaEditInstruction("");
      toast({ title: "Criteria updated", description: data.changesSummary });
    } finally {
      setIsApplyingCriteriaEdit(false);
    }
  };

  const saveFitCriteria = async () => {
    setIsSavingFitCriteria(true);
    await supabase.from("industry_trackers").update({
      fit_criteria_size: editedSizeCriteria, fit_criteria_service: editedServiceCriteria,
      fit_criteria_geography: editedGeographyCriteria, fit_criteria_buyer_types: editedBuyerTypesCriteria, updated_at: new Date().toISOString()
    }).eq("id", id);

    try {
      const criteriaText = `Size Criteria: ${editedSizeCriteria}\n\nService/Product Criteria: ${editedServiceCriteria}\n\nGeography Criteria: ${editedGeographyCriteria}\n\nBuyer Types: ${editedBuyerTypesCriteria}`;
      const { data: parsedData } = await supabase.functions.invoke('parse-fit-criteria', { body: { fit_criteria: criteriaText } });
      if (parsedData?.success) {
        await supabase.from("industry_trackers").update({ size_criteria: parsedData.size_criteria, service_criteria: parsedData.service_criteria, geography_criteria: parsedData.geography_criteria, buyer_types_criteria: parsedData.buyer_types_criteria }).eq("id", id);
        setTracker({ ...tracker, fit_criteria_size: editedSizeCriteria, fit_criteria_service: editedServiceCriteria, fit_criteria_geography: editedGeographyCriteria, fit_criteria_buyer_types: editedBuyerTypesCriteria, size_criteria: parsedData.size_criteria, service_criteria: parsedData.service_criteria, geography_criteria: parsedData.geography_criteria, buyer_types_criteria: parsedData.buyer_types_criteria });
      }
    } catch {}
    toast({ title: "Fit criteria updated" });
    setIsEditingFitCriteria(false);
    setIsSavingFitCriteria(false);
  };

  const handleApplyCriteria = async (data: { sizeCriteria: string; serviceCriteria: string; geographyCriteria: string; buyerTypesCriteria: string }) => {
    await supabase.from("industry_trackers").update({
      fit_criteria_size: data.sizeCriteria, fit_criteria_service: data.serviceCriteria,
      fit_criteria_geography: data.geographyCriteria, fit_criteria_buyer_types: data.buyerTypesCriteria, updated_at: new Date().toISOString()
    }).eq("id", id);
    try {
      const criteriaText = `Size Criteria: ${data.sizeCriteria}\n\nService/Product Criteria: ${data.serviceCriteria}\n\nGeography Criteria: ${data.geographyCriteria}\n\nBuyer Types: ${data.buyerTypesCriteria}`;
      const { data: parsedData } = await supabase.functions.invoke('parse-fit-criteria', { body: { fit_criteria: criteriaText } });
      if (parsedData?.success) {
        await supabase.from("industry_trackers").update({ size_criteria: parsedData.size_criteria, service_criteria: parsedData.service_criteria, geography_criteria: parsedData.geography_criteria, buyer_types_criteria: parsedData.buyer_types_criteria }).eq("id", id);
        setTracker({ ...tracker, ...data, size_criteria: parsedData.size_criteria, service_criteria: parsedData.service_criteria, geography_criteria: parsedData.geography_criteria, buyer_types_criteria: parsedData.buyer_types_criteria });
      }
    } catch {}
    toast({ title: "Criteria applied" });
  };

  // Document actions
  const uploadDocuments = async (files: FileList) => {
    setIsUploadingDocs(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "Error", description: "You must be logged in", variant: "destructive" }); setIsUploadingDocs(false); return; }
    const existingDocs = (tracker?.documents as any[]) || [];
    const newDocs = [...existingDocs];
    for (const file of Array.from(files)) {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('tracker-documents').upload(filePath, file);
      if (!error) newDocs.push({ name: file.name, path: filePath, size: file.size });
    }
    await supabase.from('industry_trackers').update({ documents: newDocs, updated_at: new Date().toISOString() }).eq('id', id);
    setTracker({ ...tracker, documents: newDocs });
    toast({ title: "Documents uploaded" });
    setIsUploadingDocs(false);
  };

  const removeDocument = async (doc: { name: string; path: string }) => {
    await supabase.storage.from('tracker-documents').remove([doc.path]);
    const updatedDocs = ((tracker?.documents as any[]) || []).filter(d => d.path !== doc.path);
    await supabase.from('industry_trackers').update({ documents: updatedDocs, updated_at: new Date().toISOString() }).eq('id', id);
    setTracker({ ...tracker, documents: updatedDocs });
    toast({ title: "Document removed" });
  };

  const downloadDocument = async (doc: { name: string; path: string }) => {
    const { data } = await supabase.storage.from('tracker-documents').createSignedUrl(doc.path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const performDocumentAnalysis = async () => {
    setShowAnalysisConfirmDialog(false);
    setIsAnalyzingDocuments(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-tracker-documents', { body: { tracker_id: id } });
      if (error || !data?.success) { toast({ title: "Analysis failed", variant: "destructive" }); return; }
      setTracker({ ...tracker, size_criteria: data.size_criteria, service_criteria: data.service_criteria, geography_criteria: data.geography_criteria, buyer_types_criteria: data.buyer_types_criteria, documents_analyzed_at: new Date().toISOString() });
      toast({ title: "Documents analyzed" });
    } finally {
      setIsAnalyzingDocuments(false);
    }
  };

  const handleAnalyzeDocuments = () => {
    if (!tracker?.documents?.length) { toast({ title: "No documents", variant: "destructive" }); return; }
    if (hasExistingCriteria()) { setShowAnalysisConfirmDialog(true); return; }
    performDocumentAnalysis();
  };

  if (isLoading) return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  if (!tracker) return <AppLayout><div className="text-center py-12">Tracker not found</div></AppLayout>;

  return (
    <AppLayout>
      {/* Document Analysis Confirmation Dialog */}
      <AlertDialog open={showAnalysisConfirmDialog} onOpenChange={setShowAnalysisConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing criteria?</AlertDialogTitle>
            <AlertDialogDescription>This will replace current structured criteria with data from uploaded documents.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performDocumentAnalysis}>Replace & Analyze</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/trackers")}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">{tracker.industry_name}</h1>
            <p className="text-muted-foreground">{buyers.length} buyers · {deals.length} deals</p>
          </div>
          <Button onClick={() => navigate(`/trackers/${id}/deals/new`)}><Plus className="w-4 h-4 mr-2" />List New Deal</Button>
        </div>

        {/* Scoring Behavior */}
        <ScoringBehaviorPanel
          scoringBehavior={tracker.scoring_behavior}
          industryName={tracker.industry_name}
          onSave={async (behavior) => {
            await supabase.from("industry_trackers").update({ scoring_behavior: behavior as any, updated_at: new Date().toISOString() }).eq("id", id);
            setTracker({ ...tracker, scoring_behavior: behavior });
            toast({ title: "Scoring configuration saved" });
          }}
        />

        {/* Fit Criteria Section */}
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-start justify-between gap-4">
            <button onClick={() => !isEditingFitCriteria && setIsCriteriaCollapsed(!isCriteriaCollapsed)} className="flex items-center gap-2 hover:opacity-80" disabled={isEditingFitCriteria}>
              {isCriteriaCollapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              <Info className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Buyer Fit Criteria</h3>
            </button>
            <div className="flex items-center gap-2">
              {!isEditingFitCriteria && tracker?.ma_guide_content && !hasExistingCriteria() && (
                <Button variant="outline" size="sm" onClick={extractCriteriaFromGuide} disabled={isExtractingFromGuide}>
                  {isExtractingFromGuide ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <BookOpen className="w-3.5 h-3.5 mr-1" />}
                  Extract from Guide
                </Button>
              )}
              {!isEditingFitCriteria && (
                <Button variant="ghost" size="sm" onClick={startEditingFitCriteria}><Pencil className="w-3.5 h-3.5 mr-1" />Edit</Button>
              )}
            </div>
          </div>

          {/* Fit Criteria Edit Dialog */}
          <Dialog open={isEditingFitCriteria} onOpenChange={(open) => !open && cancelEditingFitCriteria()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Info className="w-5 h-5 text-primary" />Edit Buyer Fit Criteria</DialogTitle>
                <DialogDescription>Define the criteria that will guide buyer matching.</DialogDescription>
              </DialogHeader>
              
              {/* AI Quick Edit */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-primary"><MessageSquare className="w-4 h-4" />Quick Edit with AI</div>
                <div className="flex gap-2">
                  <Input value={criteriaEditInstruction} onChange={(e) => setCriteriaEditInstruction(e.target.value)} placeholder="e.g., Lower minimum locations to 3" className="flex-1" disabled={isApplyingCriteriaEdit}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !isApplyingCriteriaEdit) { e.preventDefault(); applyCriteriaEditWithAI(); } }}
                  />
                  <Button onClick={applyCriteriaEditWithAI} disabled={isApplyingCriteriaEdit || !criteriaEditInstruction.trim()} size="sm">
                    {isApplyingCriteriaEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                {lastCriteriaChangesSummary && <div className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" />{lastCriteriaChangesSummary}</div>}
              </div>

              {/* Criteria Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />Size Criteria</Label><Textarea value={editedSizeCriteria} onChange={(e) => setEditedSizeCriteria(e.target.value)} rows={6} /></div>
                <div className="space-y-2"><Label className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />Service/Product Mix</Label><Textarea value={editedServiceCriteria} onChange={(e) => setEditedServiceCriteria(e.target.value)} rows={6} /></div>
                <div className="space-y-2"><Label className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Geography</Label><Textarea value={editedGeographyCriteria} onChange={(e) => setEditedGeographyCriteria(e.target.value)} rows={6} /></div>
                <div className="space-y-2"><Label className="flex items-center gap-1"><Target className="w-3.5 h-3.5" />Buyer Types</Label><Textarea value={editedBuyerTypesCriteria} onChange={(e) => setEditedBuyerTypesCriteria(e.target.value)} rows={6} /></div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={cancelEditingFitCriteria}>Cancel</Button>
                <Button onClick={saveFitCriteria} disabled={isSavingFitCriteria}>
                  {isSavingFitCriteria ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Collapsed/Expanded Content */}
          {!isCriteriaCollapsed && (
            <>
              {hasExistingCriteria() ? (
                <StructuredCriteriaPanel sizeCriteria={tracker.size_criteria} serviceCriteria={tracker.service_criteria} geographyCriteria={tracker.geography_criteria} buyerTypesCriteria={tracker.buyer_types_criteria} />
              ) : (
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-muted-foreground italic">No fit criteria defined.</p>
                  <TrackerNotesSection onApply={handleApplyCriteria} />
                  <AIResearchSection industryName={tracker.industry_name} trackerId={id} onApply={handleApplyCriteria} />
                </div>
              )}

              {/* Documents Section */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Supporting Documents</span>
                    {tracker.documents?.length > 0 && <Badge variant="outline" className="text-xs">{tracker.documents.length}</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="file" ref={docFileInputRef} onChange={(e) => e.target.files && uploadDocuments(e.target.files)} multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" className="hidden" />
                    <Button variant="outline" size="sm" onClick={() => docFileInputRef.current?.click()} disabled={isUploadingDocs}>
                      {isUploadingDocs ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}Add Documents
                    </Button>
                    {tracker.documents?.length > 0 && (
                      <Button variant="outline" size="sm" onClick={handleAnalyzeDocuments} disabled={isAnalyzingDocuments}>
                        {isAnalyzingDocuments ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileSearch className="w-3.5 h-3.5 mr-1" />}
                        {tracker.documents_analyzed_at ? 'Re-analyze' : 'Analyze'}
                      </Button>
                    )}
                  </div>
                </div>
                {tracker.documents?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(tracker.documents as any[]).map((doc, idx) => (
                      <div key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md text-sm">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{doc.name}</span>
                        <button onClick={() => downloadDocument(doc)} className="p-0.5 hover:bg-muted rounded"><Download className="w-3 h-3 text-muted-foreground" /></button>
                        <button onClick={() => removeDocument(doc)} className="p-0.5 hover:bg-destructive/20 rounded"><X className="w-3 h-3 text-muted-foreground hover:text-destructive" /></button>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground italic">No documents uploaded.</p>}
              </div>

              {/* KPI Config */}
              <div className="mt-4 pt-4 border-t">
                <KPIConfigPanel
                  config={tracker.kpi_scoring_config as any}
                  industryName={tracker.industry_name}
                  onChange={async (newConfig) => {
                    await supabase.from("industry_trackers").update({ kpi_scoring_config: newConfig as any, updated_at: new Date().toISOString() }).eq("id", id);
                    setTracker({ ...tracker, kpi_scoring_config: newConfig });
                    toast({ title: "KPI config saved" });
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Tabs for Buyers and Deals */}
        <Tabs defaultValue="buyers">
          <TabsList>
            <TabsTrigger value="buyers"><Users className="w-4 h-4 mr-2" />Buyers ({buyers.length})</TabsTrigger>
            <TabsTrigger value="deals"><FileText className="w-4 h-4 mr-2" />Deals ({deals.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="buyers" className="mt-4">
            <TrackerBuyersTab
              trackerId={id!}
              buyers={buyers}
              search={search}
              onSearchChange={setSearch}
              enrichingBuyers={enrichingBuyers}
              isBulkEnriching={isBulkEnriching}
              buyerEnrichmentProgress={buyerEnrichmentProgress}
              selectedBuyerIds={selectedBuyerIds}
              highlightedBuyerIds={highlightedBuyerIds}
              onSelectBuyer={(buyerId, selected) => {
                setSelectedBuyerIds(prev => {
                  const next = new Set(prev);
                  if (selected) next.add(buyerId); else next.delete(buyerId);
                  return next;
                });
              }}
              onSelectAll={(selected) => {
                if (selected) setSelectedBuyerIds(new Set(buyers.map(b => b.id)));
                else setSelectedBuyerIds(new Set());
              }}
              onEnrichBuyer={enrichBuyer}
              onEnrichAll={enrichAllBuyers}
              onDeleteBuyer={deleteBuyer}
              onDeleteSelected={deleteSelectedBuyers}
              onAddBuyer={addBuyer}
              onImportComplete={loadData}
              onCheckDuplicates={checkForDuplicates}
              onExecuteDedupe={executeDedupe}
              isDeduping={isDeduping}
              dedupeDialogOpen={dedupeDialogOpen}
              onDedupeDialogOpenChange={setDedupeDialogOpen}
              dedupePreview={dedupePreview}
              hasInterruptedSession={hasInterruptedSession}
              interruptedSessionInfo={interruptedSessionInfo}
              onResumeEnrichment={() => { clearEnrichmentProgress(); enrichAllBuyers(); }}
              onDismissSession={clearEnrichmentProgress}
              buyerSortColumn={buyerSortColumn}
              buyerSortDirection={buyerSortDirection}
              onSort={handleBuyerSort}
            />
          </TabsContent>
          
          <TabsContent value="deals" className="mt-4">
            <TrackerDealsTab
              trackerId={id!}
              deals={deals}
              dealBuyerCounts={dealBuyerCounts}
              enrichingDeals={enrichingDeals}
              isBulkEnrichingDeals={isBulkEnrichingDeals}
              dealEnrichmentProgress={dealEnrichmentProgress}
              isScoringAll={isScoringAll}
              scoringProgress={scoringProgress}
              dealSortColumn={dealSortColumn}
              dealSortDirection={dealSortDirection}
              onSort={handleDealSort}
              onEnrichDeal={enrichDeal}
              onEnrichAllDeals={enrichAllDeals}
              onScoreAllDeals={scoreAllDeals}
              onArchiveDeal={archiveDeal}
              onDeleteDeal={deleteDeal}
              onImportComplete={loadData}
            />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Tracker AI Chat */}
      <TrackerQueryChat 
        trackerId={id!} 
        trackerName={tracker.industry_name}
        selectedBuyerIds={Array.from(selectedBuyerIds)}
        totalBuyerCount={buyers.length}
        onHighlightBuyers={(buyerIds) => {
          setHighlightedBuyerIds(new Set(buyerIds));
          setSelectedBuyerIds(new Set());
          toast({ title: `${buyerIds.length} buyer${buyerIds.length === 1 ? '' : 's'} highlighted` });
        }}
      />
    </AppLayout>
  );
}
