import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// Helper to save files without external dependencies
function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Types for export data
export interface TrackerExportData {
  exportVersion: string;
  exportedAt: string;
  tracker: Tables<"industry_trackers">;
  buyers: BuyerExportData[];
  deals: DealExportData[];
  stats: ExportStats;
}

interface BuyerExportData extends Tables<"buyers"> {
  contacts: Tables<"buyer_contacts">[];
  transcripts: Tables<"buyer_transcripts">[];
}

interface DealExportData extends Tables<"deals"> {
  transcripts: Tables<"deal_transcripts">[];
  scoringAdjustments: Tables<"deal_scoring_adjustments"> | null;
}

interface ExportStats {
  buyerCount: number;
  dealCount: number;
  contactCount: number;
  buyerTranscriptCount: number;
  dealTranscriptCount: number;
  scoreCount: number;
}

/**
 * Fetch all tracker data for export
 */
export async function fetchTrackerExportData(trackerId: string): Promise<TrackerExportData> {
  // Fetch all data in parallel
  const [
    trackerRes,
    buyersRes,
    dealsRes,
    buyerContactsRes,
    buyerTranscriptsRes,
    dealTranscriptsRes,
    scoresRes,
    scoringAdjustmentsRes,
  ] = await Promise.all([
    supabase.from("industry_trackers").select("*").eq("id", trackerId).single(),
    supabase.from("buyers").select("*").eq("tracker_id", trackerId),
    supabase.from("deals").select("*").eq("tracker_id", trackerId),
    supabase.from("buyer_contacts").select("*"),
    supabase.from("buyer_transcripts").select("*"),
    supabase.from("deal_transcripts").select("*"),
    supabase.from("buyer_deal_scores").select("*"),
    supabase.from("deal_scoring_adjustments").select("*"),
  ]);

  if (trackerRes.error) throw new Error(trackerRes.error.message);
  if (!trackerRes.data) throw new Error("Tracker not found");

  const tracker = trackerRes.data;
  const buyers = buyersRes.data || [];
  const deals = dealsRes.data || [];
  const buyerIds = buyers.map(b => b.id);
  const dealIds = deals.map(d => d.id);

  // Filter related data by buyer/deal IDs
  const buyerContacts = (buyerContactsRes.data || []).filter(c => buyerIds.includes(c.buyer_id));
  const buyerTranscripts = (buyerTranscriptsRes.data || []).filter(t => buyerIds.includes(t.buyer_id));
  const dealTranscripts = (dealTranscriptsRes.data || []).filter(t => dealIds.includes(t.deal_id));
  const scores = (scoresRes.data || []).filter(s => dealIds.includes(s.deal_id));
  const scoringAdjustments = (scoringAdjustmentsRes.data || []).filter(s => s.deal_id && dealIds.includes(s.deal_id));

  // Nest contacts and transcripts into buyers
  const buyersWithRelated: BuyerExportData[] = buyers.map(buyer => ({
    ...buyer,
    contacts: buyerContacts.filter(c => c.buyer_id === buyer.id),
    transcripts: buyerTranscripts.filter(t => t.buyer_id === buyer.id),
  }));

  // Nest transcripts and adjustments into deals
  const dealsWithRelated: DealExportData[] = deals.map(deal => ({
    ...deal,
    transcripts: dealTranscripts.filter(t => t.deal_id === deal.id),
    scoringAdjustments: scoringAdjustments.find(s => s.deal_id === deal.id) || null,
  }));

  return {
    exportVersion: "1.0.0",
    exportedAt: new Date().toISOString(),
    tracker,
    buyers: buyersWithRelated,
    deals: dealsWithRelated,
    stats: {
      buyerCount: buyers.length,
      dealCount: deals.length,
      contactCount: buyerContacts.length,
      buyerTranscriptCount: buyerTranscripts.length,
      dealTranscriptCount: dealTranscripts.length,
      scoreCount: scores.length,
    },
  };
}

/**
 * Export tracker data to JSON file
 */
export function exportTrackerToJSON(data: TrackerExportData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const filename = `${sanitizeFilename(data.tracker.industry_name)}_export_${formatDate(new Date())}.json`;
  saveFile(blob, filename);
}

/**
 * Export buyers to CSV format compatible with CSVImport
 */
export function exportBuyersToCSV(buyers: BuyerExportData[]): string {
  const headers = [
    "platform_company_name",
    "platform_website",
    "pe_firm_name",
    "pe_firm_website",
    "hq_city",
    "hq_state",
    "hq_country",
    "hq_region",
    "services_offered",
    "target_services",
    "target_industries",
    "target_geographies",
    "geographic_footprint",
    "min_revenue",
    "max_revenue",
    "min_ebitda",
    "max_ebitda",
    "revenue_sweet_spot",
    "ebitda_sweet_spot",
    "preferred_ebitda",
    "business_summary",
    "thesis_summary",
    "strategic_priorities",
    "acquisition_appetite",
    "acquisition_timeline",
    "acquisition_frequency",
    "acquisition_geography",
    "industry_vertical",
    "business_type",
    "business_model",
    "business_model_prefs",
    "business_model_exclusions",
    "industry_exclusions",
    "geographic_exclusions",
    "target_customer_profile",
    "target_customer_size",
    "target_customer_geography",
    "target_customer_industries",
    "target_business_model",
    "customer_industries",
    "customer_geographic_reach",
    "primary_customer_size",
    "go_to_market_strategy",
    "revenue_model",
    "specialized_focus",
    "service_mix_prefs",
    "portfolio_companies",
    "recent_acquisitions",
    "total_acquisitions",
    "last_acquisition_date",
    "deal_breakers",
    "required_capabilities",
    "owner_roll_requirement",
    "owner_transition_goals",
    "key_quotes",
    "has_fee_agreement",
    "fee_agreement_status",
    "addon_only",
    "platform_only",
    "thesis_confidence",
    "num_platforms",
    "service_regions",
    "other_office_locations",
  ];

  const rows = buyers.map(buyer => {
    return headers.map(header => {
      const value = (buyer as any)[header];
      if (value === null || value === undefined) return "";
      if (Array.isArray(value)) return value.join("; ");
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    });
  });

  return generateCSV(headers, rows);
}

/**
 * Export deals to CSV format compatible with DealCSVImport
 */
export function exportDealsToCSV(deals: DealExportData[]): string {
  const headers = [
    "deal_name",
    "company_website",
    "transcript_link",
    "additional_info",
    "company_overview",
    "company_address",
    "contact_name",
    "contact_title",
    "contact_email",
    "contact_phone",
    "contact_linkedin",
    "revenue",
    "ebitda_amount",
    "ebitda_percentage",
    "geography",
    "headquarters",
    "service_mix",
    "owner_goals",
    "business_model",
    "industry_type",
    "employee_count",
    "location_count",
    "founded_year",
    "status",
    "deal_score",
    "ownership_structure",
    "growth_trajectory",
    "customer_concentration",
    "customer_geography",
    "end_market_customers",
    "competitive_position",
    "real_estate",
    "technology_systems",
    "special_requirements",
    "key_risks",
    "financial_notes",
    "financial_followup_questions",
  ];

  const rows = deals.map(deal => {
    return headers.map(header => {
      const value = (deal as any)[header];
      if (value === null || value === undefined) return "";
      if (Array.isArray(value)) return value.join("; ");
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    });
  });

  return generateCSV(headers, rows);
}

/**
 * Export buyer contacts to CSV
 */
export function exportContactsToCSV(buyers: BuyerExportData[]): string {
  const headers = [
    "buyer_platform_website",
    "buyer_pe_firm_name",
    "name",
    "title",
    "email",
    "phone",
    "linkedin_url",
    "role_category",
    "company_type",
    "is_primary_contact",
    "is_deal_team",
    "priority_level",
    "source",
    "source_url",
    "email_confidence",
    "fee_agreement_status",
    "last_contacted_date",
    "salesforce_id",
  ];

  const rows: string[][] = [];
  buyers.forEach(buyer => {
    buyer.contacts.forEach(contact => {
      rows.push([
        buyer.platform_website || "",
        buyer.pe_firm_name || "",
        contact.name || "",
        contact.title || "",
        contact.email || "",
        contact.phone || "",
        contact.linkedin_url || "",
        contact.role_category || "",
        contact.company_type || "",
        contact.is_primary_contact ? "true" : "false",
        contact.is_deal_team ? "true" : "false",
        contact.priority_level?.toString() || "",
        contact.source || "",
        contact.source_url || "",
        contact.email_confidence || "",
        contact.fee_agreement_status || "",
        contact.last_contacted_date || "",
        contact.salesforce_id || "",
      ]);
    });
  });

  return generateCSV(headers, rows);
}

/**
 * Export buyer-deal scores to CSV
 */
export async function exportScoresToCSV(trackerId: string): Promise<string> {
  const { data: scores } = await supabase
    .from("buyer_deal_scores")
    .select("*, buyers!inner(platform_website, pe_firm_name), deals!inner(deal_name, company_website)")
    .eq("buyers.tracker_id", trackerId);

  const headers = [
    "buyer_platform_website",
    "buyer_pe_firm_name",
    "deal_name",
    "deal_company_website",
    "composite_score",
    "geography_score",
    "service_score",
    "portfolio_score",
    "acquisition_score",
    "business_model_score",
    "thesis_bonus",
    "human_override_score",
    "fit_reasoning",
    "data_completeness",
    "selected_for_outreach",
    "interested",
    "interested_at",
    "passed_on_deal",
    "pass_reason",
    "pass_category",
    "pass_notes",
    "passed_at",
    "rejection_reason",
    "rejection_category",
    "rejection_notes",
    "rejected_at",
    "hidden_from_deal",
    "scored_at",
  ];

  const rows = (scores || []).map(score => {
    const buyer = (score as any).buyers;
    const deal = (score as any).deals;
    return [
      buyer?.platform_website || "",
      buyer?.pe_firm_name || "",
      deal?.deal_name || "",
      deal?.company_website || "",
      score.composite_score?.toString() || "",
      score.geography_score?.toString() || "",
      score.service_score?.toString() || "",
      score.portfolio_score?.toString() || "",
      score.acquisition_score?.toString() || "",
      score.business_model_score?.toString() || "",
      score.thesis_bonus?.toString() || "",
      score.human_override_score?.toString() || "",
      score.fit_reasoning || "",
      score.data_completeness || "",
      score.selected_for_outreach ? "true" : "false",
      score.interested ? "true" : "false",
      score.interested_at || "",
      score.passed_on_deal ? "true" : "false",
      score.pass_reason || "",
      score.pass_category || "",
      score.pass_notes || "",
      score.passed_at || "",
      score.rejection_reason || "",
      score.rejection_category || "",
      score.rejection_notes || "",
      score.rejected_at || "",
      score.hidden_from_deal ? "true" : "false",
      score.scored_at || "",
    ];
  });

  return generateCSV(headers, rows);
}

/**
 * Generate instructions markdown for re-import
 */
export function generateInstructionsMarkdown(data: TrackerExportData): string {
  return `# ${data.tracker.industry_name} - Export Instructions

## Export Summary

- **Exported At:** ${new Date(data.exportedAt).toLocaleString()}
- **Export Version:** ${data.exportVersion}

### Data Counts
| Data Type | Count |
|-----------|-------|
| Buyers | ${data.stats.buyerCount} |
| Deals | ${data.stats.dealCount} |
| Buyer Contacts | ${data.stats.contactCount} |
| Buyer Transcripts | ${data.stats.buyerTranscriptCount} |
| Deal Transcripts | ${data.stats.dealTranscriptCount} |
| Buyer-Deal Scores | ${data.stats.scoreCount} |

---

## Re-Import Instructions

### Step 1: Create New Tracker
1. Go to Trackers → New Tracker
2. Enter the industry name: **${data.tracker.industry_name}**
3. Create the tracker

### Step 2: Configure Tracker Settings (from tracker_config.json)
The tracker configuration is stored in \`tracker_config.json\`. Key settings to manually configure:

- **Size Criteria:** ${data.tracker.fit_criteria_size ? "✓ Configured" : "Not set"}
- **Service Criteria:** ${data.tracker.fit_criteria_service ? "✓ Configured" : "Not set"}
- **Geography Criteria:** ${data.tracker.fit_criteria_geography ? "✓ Configured" : "Not set"}
- **Buyer Types Criteria:** ${data.tracker.fit_criteria_buyer_types ? "✓ Configured" : "Not set"}

**Scoring Weights:**
- Geography Weight: ${data.tracker.geography_weight}
- Service Mix Weight: ${data.tracker.service_mix_weight}
- Size Weight: ${data.tracker.size_weight}
- Owner Goals Weight: ${data.tracker.owner_goals_weight}

### Step 3: Import Buyers
1. Open the tracker detail page
2. Go to the **Buyers** tab
3. Click **Import CSV**
4. Upload \`buyers.csv\`
5. Review the AI column mapping
6. Click Import

**Important Buyer Fields:**
| CSV Column | Description |
|------------|-------------|
| platform_company_name | Platform/portfolio company name |
| platform_website | Platform website (REQUIRED for dedup) |
| pe_firm_name | PE firm name |
| pe_firm_website | PE firm website (REQUIRED) |
| services_offered | Semicolon-separated list |
| target_services | Semicolon-separated list |
| target_geographies | Semicolon-separated list |

### Step 4: Import Deals
1. Go to the **Deals** tab
2. Click **Import Deals**
3. Upload \`deals.csv\`
4. Review the AI column mapping
5. Handle any duplicates
6. Click Import

**Important Deal Fields:**
| CSV Column | Description |
|------------|-------------|
| deal_name | Company/deal name (REQUIRED) |
| company_website | Website for dedup |
| transcript_link | Fireflies or other transcript URL |
| additional_info | Notes to analyze |
| geography | Semicolon-separated states/regions |
| revenue | Annual revenue in dollars |
| ebitda_percentage | EBITDA margin percentage |

### Step 5: Import Contacts (Optional)
The \`buyer_contacts.csv\` contains all buyer contacts. Currently this requires manual entry or database import.

**Contact Reference Fields:**
- \`buyer_platform_website\` - Links contact to buyer
- \`buyer_pe_firm_name\` - Secondary reference

### Step 6: Enrich & Score
After importing:
1. Click **Enrich All** on Buyers tab to re-scrape websites
2. Click **Enrich All** on Deals tab to re-extract transcripts
3. Scoring will automatically run during enrichment

---

## What's NOT Preserved

The following data requires manual recreation or is intentionally not exported:

1. **Internal IDs** - All UUIDs are regenerated on import
2. **Buyer-Deal Scores** - Will be regenerated when you run enrichment/scoring
3. **Documents** - M&A guide and uploaded files are not exported
4. **User IDs** - The new tracker will belong to the importing user
5. **Timestamps** - Created/updated dates will be new

---

## File Descriptions

| File | Description |
|------|-------------|
| \`tracker_config.json\` | Tracker settings, criteria, weights |
| \`buyers.csv\` | All buyers with criteria preferences |
| \`deals.csv\` | All deals with company data |
| \`buyer_contacts.csv\` | All contacts linked to buyers |
| \`buyer_deal_scores.csv\` | Historical score data (reference only) |
| \`INSTRUCTIONS.md\` | This file |

---

## Troubleshooting

**Duplicates detected during import?**
- Use "Skip" to ignore rows that match existing records
- Use "Merge" to combine data into existing records
- Use "Create New" to force duplicate creation

**Missing fields after import?**
- Run "Enrich All" to fill gaps from websites/transcripts
- Check that CSVs weren't modified (quotes, commas)

**Contact import not working?**
- Contacts must be added manually or via database import
- Use buyer_platform_website to match contacts to buyers

---

*Generated by Tracker Export System v${data.exportVersion}*
`;
}

/**
 * Export complete package as ZIP file
 */
export async function exportFullPackage(trackerId: string): Promise<void> {
  // Dynamic import JSZip to avoid bundling issues
  const JSZip = (await import("jszip")).default;
  
  const data = await fetchTrackerExportData(trackerId);
  const zip = new JSZip();

  // Add tracker config JSON
  const trackerConfig = {
    industry_name: data.tracker.industry_name,
    fit_criteria: data.tracker.fit_criteria,
    fit_criteria_size: data.tracker.fit_criteria_size,
    fit_criteria_service: data.tracker.fit_criteria_service,
    fit_criteria_geography: data.tracker.fit_criteria_geography,
    fit_criteria_buyer_types: data.tracker.fit_criteria_buyer_types,
    size_criteria: data.tracker.size_criteria,
    service_criteria: data.tracker.service_criteria,
    geography_criteria: data.tracker.geography_criteria,
    buyer_types_criteria: data.tracker.buyer_types_criteria,
    geography_weight: data.tracker.geography_weight,
    service_mix_weight: data.tracker.service_mix_weight,
    size_weight: data.tracker.size_weight,
    owner_goals_weight: data.tracker.owner_goals_weight,
    scoring_behavior: data.tracker.scoring_behavior,
    kpi_scoring_config: data.tracker.kpi_scoring_config,
    industry_template: data.tracker.industry_template,
    ma_guide_content: data.tracker.ma_guide_content,
  };
  zip.file("tracker_config.json", JSON.stringify(trackerConfig, null, 2));

  // Add CSVs
  zip.file("buyers.csv", exportBuyersToCSV(data.buyers));
  zip.file("deals.csv", exportDealsToCSV(data.deals));
  zip.file("buyer_contacts.csv", exportContactsToCSV(data.buyers));
  
  // Add scores CSV
  const scoresCSV = await exportScoresToCSV(trackerId);
  zip.file("buyer_deal_scores.csv", scoresCSV);

  // Add instructions
  zip.file("INSTRUCTIONS.md", generateInstructionsMarkdown(data));

  // Add full JSON backup
  zip.file("full_backup.json", JSON.stringify(data, null, 2));

  // Generate and download ZIP
  const content = await zip.generateAsync({ type: "blob" });
  const filename = `${sanitizeFilename(data.tracker.industry_name)}_export_${formatDate(new Date())}.zip`;
  saveFile(content, filename);
}

// Helper functions
function generateCSV(headers: string[], rows: string[][]): string {
  const escapeCSV = (value: string): string => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map(row => row.map(escapeCSV).join(","));
  return [headerLine, ...dataLines].join("\n");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}
