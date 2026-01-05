import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tracker, TrackerEnrichmentProgress, TrackerSortState, TrackerSelectionState } from "../types";
import { getEnrichmentStorageKey } from "../types";

interface UseTrackerStateOptions {
  trackerId: string | undefined;
}

interface UseTrackerStateReturn {
  // Core data
  tracker: Tracker | null;
  buyers: any[];
  deals: any[];
  dealBuyerCounts: Record<string, { approved: number; interested: number; passed: number }>;
  isLoading: boolean;

  // UI state
  search: string;
  setSearch: (search: string) => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;

  // Enrichment state
  enrichingBuyers: Set<string>;
  setEnrichingBuyers: React.Dispatch<React.SetStateAction<Set<string>>>;
  isBulkEnriching: boolean;
  setIsBulkEnriching: (enriching: boolean) => void;
  buyerEnrichmentProgress: { current: number; total: number };
  setBuyerEnrichmentProgress: (progress: { current: number; total: number }) => void;
  enrichingDeals: Set<string>;
  setEnrichingDeals: React.Dispatch<React.SetStateAction<Set<string>>>;
  isBulkEnrichingDeals: boolean;
  setIsBulkEnrichingDeals: (enriching: boolean) => void;
  dealEnrichmentProgress: { current: number; total: number };
  setDealEnrichmentProgress: (progress: { current: number; total: number }) => void;

  // Interrupted session
  hasInterruptedSession: boolean;
  setHasInterruptedSession: (has: boolean) => void;
  interruptedSessionInfo: { processed: number; remaining: number } | null;
  setInterruptedSessionInfo: (info: { processed: number; remaining: number } | null) => void;

  // Criteria state
  isEditingFitCriteria: boolean;
  setIsEditingFitCriteria: (editing: boolean) => void;
  editedSizeCriteria: string;
  setEditedSizeCriteria: (criteria: string) => void;
  editedServiceCriteria: string;
  setEditedServiceCriteria: (criteria: string) => void;
  editedGeographyCriteria: string;
  setEditedGeographyCriteria: (criteria: string) => void;
  editedBuyerTypesCriteria: string;
  setEditedBuyerTypesCriteria: (criteria: string) => void;
  isSavingFitCriteria: boolean;
  setIsSavingFitCriteria: (saving: boolean) => void;
  isParsingCriteria: boolean;
  setIsParsingCriteria: (parsing: boolean) => void;
  criteriaEditInstruction: string;
  setCriteriaEditInstruction: (instruction: string) => void;
  isApplyingCriteriaEdit: boolean;
  setIsApplyingCriteriaEdit: (applying: boolean) => void;
  lastCriteriaChangesSummary: string;
  setLastCriteriaChangesSummary: (summary: string) => void;
  isCriteriaCollapsed: boolean;
  setIsCriteriaCollapsed: (collapsed: boolean) => void;

  // Document state
  isAnalyzingDocuments: boolean;
  setIsAnalyzingDocuments: (analyzing: boolean) => void;
  showAnalysisConfirmDialog: boolean;
  setShowAnalysisConfirmDialog: (show: boolean) => void;
  isUploadingDocs: boolean;
  setIsUploadingDocs: (uploading: boolean) => void;
  isExtractingFromGuide: boolean;
  setIsExtractingFromGuide: (extracting: boolean) => void;

  // Scoring state
  isScoringAll: boolean;
  setIsScoringAll: (scoring: boolean) => void;
  scoringProgress: { current: number; total: number };
  setScoringProgress: (progress: { current: number; total: number }) => void;

  // Sort state
  dealSortColumn: string;
  setDealSortColumn: (column: string) => void;
  dealSortDirection: "asc" | "desc";
  setDealSortDirection: (direction: "asc" | "desc") => void;
  buyerSortColumn: string;
  setBuyerSortColumn: (column: string) => void;
  buyerSortDirection: "asc" | "desc";
  setBuyerSortDirection: (direction: "asc" | "desc") => void;

  // Selection state
  highlightedBuyerIds: Set<string>;
  setHighlightedBuyerIds: (ids: Set<string>) => void;
  selectedBuyerIds: Set<string>;
  setSelectedBuyerIds: (ids: Set<string>) => void;
  isDeletingSelected: boolean;
  setIsDeletingSelected: (deleting: boolean) => void;

  // Deduplication state
  isDeduping: boolean;
  setIsDeduping: (deduping: boolean) => void;
  dedupeDialogOpen: boolean;
  setDedupeDialogOpen: (open: boolean) => void;
  dedupePreview: {
    duplicateGroups: Array<{
      key: string;
      matchType: "domain" | "name";
      count: number;
      platformNames: string[];
      peFirmNames: string[];
      mergedPeFirmName: string;
      keeperName: string;
    }>;
    stats: { groupsFound: number; totalDuplicates: number };
  } | null;
  setDedupePreview: (preview: any) => void;

  // New buyer form
  newBuyer: { pe_firm_name: string; pe_firm_website: string; platform_company_name: string; platform_website: string };
  setNewBuyer: (buyer: { pe_firm_name: string; pe_firm_website: string; platform_company_name: string; platform_website: string }) => void;

  // Refs
  docFileInputRef: React.RefObject<HTMLInputElement>;
  autoExtractAttemptedRef: React.MutableRefObject<boolean>;

  // Actions
  loadData: () => Promise<void>;
  setTracker: React.Dispatch<React.SetStateAction<Tracker | null>>;
  setBuyers: React.Dispatch<React.SetStateAction<any[]>>;
  setDeals: React.Dispatch<React.SetStateAction<any[]>>;
}

/**
 * Hook to manage all TrackerDetail state
 * Extracts ~120 lines of state declarations from TrackerDetail.tsx
 */
export function useTrackerState({ trackerId }: UseTrackerStateOptions): UseTrackerStateReturn {
  // Core data state
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [dealBuyerCounts, setDealBuyerCounts] = useState<Record<string, { approved: number; interested: number; passed: number }>>({});
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newBuyer, setNewBuyer] = useState({ pe_firm_name: "", pe_firm_website: "", platform_company_name: "", platform_website: "" });

  // Enrichment state
  const [enrichingBuyers, setEnrichingBuyers] = useState<Set<string>>(new Set());
  const [isBulkEnriching, setIsBulkEnriching] = useState(false);
  const [buyerEnrichmentProgress, setBuyerEnrichmentProgress] = useState({ current: 0, total: 0 });
  const [enrichingDeals, setEnrichingDeals] = useState<Set<string>>(new Set());
  const [isBulkEnrichingDeals, setIsBulkEnrichingDeals] = useState(false);
  const [dealEnrichmentProgress, setDealEnrichmentProgress] = useState({ current: 0, total: 0 });

  // Interrupted session state
  const [hasInterruptedSession, setHasInterruptedSession] = useState(false);
  const [interruptedSessionInfo, setInterruptedSessionInfo] = useState<{ processed: number; remaining: number } | null>(null);

  // Criteria state
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
  const [isCriteriaCollapsed, setIsCriteriaCollapsed] = useState(true);

  // Document state
  const [isAnalyzingDocuments, setIsAnalyzingDocuments] = useState(false);
  const [showAnalysisConfirmDialog, setShowAnalysisConfirmDialog] = useState(false);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const [isExtractingFromGuide, setIsExtractingFromGuide] = useState(false);

  // Scoring state
  const [isScoringAll, setIsScoringAll] = useState(false);
  const [scoringProgress, setScoringProgress] = useState({ current: 0, total: 0 });

  // Sort state
  const [dealSortColumn, setDealSortColumn] = useState<string>("deal_score");
  const [dealSortDirection, setDealSortDirection] = useState<"asc" | "desc">("desc");
  const [buyerSortColumn, setBuyerSortColumn] = useState<string>("platform_company_name");
  const [buyerSortDirection, setBuyerSortDirection] = useState<"asc" | "desc">("asc");

  // Selection state
  const [highlightedBuyerIds, setHighlightedBuyerIds] = useState<Set<string>>(new Set());
  const [selectedBuyerIds, setSelectedBuyerIds] = useState<Set<string>>(new Set());
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  // Deduplication state
  const [isDeduping, setIsDeduping] = useState(false);
  const [dedupeDialogOpen, setDedupeDialogOpen] = useState(false);
  const [dedupePreview, setDedupePreview] = useState<{
    duplicateGroups: Array<{
      key: string;
      matchType: "domain" | "name";
      count: number;
      platformNames: string[];
      peFirmNames: string[];
      mergedPeFirmName: string;
      keeperName: string;
    }>;
    stats: { groupsFound: number; totalDuplicates: number };
  } | null>(null);

  // Refs
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const autoExtractAttemptedRef = useRef(false);

  // Load data function
  const loadData = async () => {
    if (!trackerId) return;
    
    const [trackerRes, buyersRes, dealsRes] = await Promise.all([
      supabase.from("industry_trackers").select("*").eq("id", trackerId).single(),
      supabase.from("buyers").select("*").eq("tracker_id", trackerId).order("pe_firm_name"),
      supabase.from("deals").select("*").eq("tracker_id", trackerId).order("created_at", { ascending: false }),
    ]);
    
    setTracker(trackerRes.data as Tracker | null);
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

  // Load on mount
  useEffect(() => {
    loadData();
  }, [trackerId]);

  return {
    // Core data
    tracker,
    buyers,
    deals,
    dealBuyerCounts,
    isLoading,

    // UI state
    search,
    setSearch,
    dialogOpen,
    setDialogOpen,

    // Enrichment state
    enrichingBuyers,
    setEnrichingBuyers,
    isBulkEnriching,
    setIsBulkEnriching,
    buyerEnrichmentProgress,
    setBuyerEnrichmentProgress,
    enrichingDeals,
    setEnrichingDeals,
    isBulkEnrichingDeals,
    setIsBulkEnrichingDeals,
    dealEnrichmentProgress,
    setDealEnrichmentProgress,

    // Interrupted session
    hasInterruptedSession,
    setHasInterruptedSession,
    interruptedSessionInfo,
    setInterruptedSessionInfo,

    // Criteria state
    isEditingFitCriteria,
    setIsEditingFitCriteria,
    editedSizeCriteria,
    setEditedSizeCriteria,
    editedServiceCriteria,
    setEditedServiceCriteria,
    editedGeographyCriteria,
    setEditedGeographyCriteria,
    editedBuyerTypesCriteria,
    setEditedBuyerTypesCriteria,
    isSavingFitCriteria,
    setIsSavingFitCriteria,
    isParsingCriteria,
    setIsParsingCriteria,
    criteriaEditInstruction,
    setCriteriaEditInstruction,
    isApplyingCriteriaEdit,
    setIsApplyingCriteriaEdit,
    lastCriteriaChangesSummary,
    setLastCriteriaChangesSummary,
    isCriteriaCollapsed,
    setIsCriteriaCollapsed,

    // Document state
    isAnalyzingDocuments,
    setIsAnalyzingDocuments,
    showAnalysisConfirmDialog,
    setShowAnalysisConfirmDialog,
    isUploadingDocs,
    setIsUploadingDocs,
    isExtractingFromGuide,
    setIsExtractingFromGuide,

    // Scoring state
    isScoringAll,
    setIsScoringAll,
    scoringProgress,
    setScoringProgress,

    // Sort state
    dealSortColumn,
    setDealSortColumn,
    dealSortDirection,
    setDealSortDirection,
    buyerSortColumn,
    setBuyerSortColumn,
    buyerSortDirection,
    setBuyerSortDirection,

    // Selection state
    highlightedBuyerIds,
    setHighlightedBuyerIds,
    selectedBuyerIds,
    setSelectedBuyerIds,
    isDeletingSelected,
    setIsDeletingSelected,

    // Deduplication state
    isDeduping,
    setIsDeduping,
    dedupeDialogOpen,
    setDedupeDialogOpen,
    dedupePreview,
    setDedupePreview,

    // New buyer form
    newBuyer,
    setNewBuyer,

    // Refs
    docFileInputRef,
    autoExtractAttemptedRef,

    // Actions
    loadData,
    setTracker,
    setBuyers,
    setDeals,
  };
}
