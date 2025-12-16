import { supabase } from "@/integrations/supabase/client";

// Sample HVAC buyer data from CSV
const sampleBuyers = [
  { platform: "Granite Trade Services", location: "United States", description: "Electrical and specialty trade services incl. HVAC for commercial, residential, and industrial clients; focused on renovation, repair, and upgrades", pe: "VSS Capital Partners" },
  { platform: "Comfort Temp", location: "Gainesville, FL", description: "Provider of commercial and residential HVAC, refrigeration, and plumbing services", pe: "Shore Capital Partners" },
  { platform: "TruTemp", location: "Apex, NC", description: "Provider of residential HVAC, plumbing, and electrical services", pe: "Centre Partners Management" },
  { platform: "AMX Mechanical / AMX Heating & Cooling", location: "Pleasantville, NY", description: "Commercial HVAC/mechanical contractor and premier residential heating and cooling contractor", pe: "Waypoint Capital Partners" },
  { platform: "Redwood Services", location: "Memphis, TN", description: "National essential home services platform partnering with residential HVAC, plumbing, and electrical contractors", pe: "Altas Partners" },
  { platform: "Sila Services", location: "King of Prussia, PA", description: "Provider of residential HVAC, plumbing, and electrical services", pe: "Goldman Sachs" },
  { platform: "Airtron Heating & Air Conditioning", location: "Columbus, OH", description: "Provider of installation, maintenance, and replacement services for residential HVAC systems", pe: "Gamut Capital Management" },
  { platform: "Cardinal Heating & Air", location: "Kirkland, WA", description: "Provider of residential HVAC services including repair, replacement, and custom home work", pe: "SE Capital" },
  { platform: "United Comfort Group", location: "Lorton, VA", description: "Provider of HVAC and plumbing services to residential homeowners in the Mid-Atlantic and Southeast", pe: "Littlejohn & Co." },
  { platform: "Service Country", location: "Atlanta, GA", description: "Provider of residential HVAC, plumbing, and electrical services", pe: "Grove Mountain Partners" },
  { platform: "Columbia Home Services", location: "Dallas, TX", description: "Residential services platform acquiring HVAC, plumbing, and electrical services companies", pe: "Tenex Capital Management" },
  { platform: "Flint Group", location: "Kansas City, MO", description: "Home services platform providing HVAC, plumbing, and electrical services to residential customers", pe: "General Atlantic" },
  { platform: "Marathon HVAC Service", location: "Covina, CA", description: "Residential heating and air conditioning service, repair, and replacement company", pe: "Sound Partners" },
  { platform: "Friendly Group", location: "Westlake, TX", description: "Provider of residential HVAC, plumbing, drainage, sewer, and electrical services", pe: "ACE & Company" },
  { platform: "Legacy Service Partners", location: "Tampa, FL", description: "Provider of residential HVAC, plumbing, and electrical maintenance, repair, and replacement services", pe: "Gridiron Capital" },
  { platform: "Apex Service Partners", location: "Tampa, FL", description: "HVAC, plumbing, and electrical services group building a national platform", pe: "Torreal" },
  { platform: "Del-Air Heating, Air Conditioning, Plumbing and Electrical", location: "Sanford, FL", description: "Provider of residential HVAC installation and service, plumbing, electrical and light commercial HVAC", pe: "Astara Capital Partners" },
  { platform: "Four Seasons Heating & Air Conditioning", location: "Chicago, IL", description: "Provider of residential HVAC, plumbing, and electrical repair and replacement services", pe: "Cortec Group" },
  { platform: "Blue Cardinal Home Services Group", location: "Lufkin, TX", description: "Multi-regional home services network specializing in residential HVAC, plumbing, and electrical services", pe: "Percheron Capital" },
  { platform: "Cascade Services", location: "Boca Raton, FL", description: "Residential trade services platform focused on HVAC, plumbing, and electrical services", pe: "Trive Capital" },
  { platform: "P1 Service Group", location: "Minneapolis, MN", description: "Investment firm partnering with companies providing residential HVAC, plumbing, and electrical services", pe: "The Edgewater Funds" },
  { platform: "Southeast Mechanical", location: "Charlotte, NC", description: "Network of residential and commercial HVAC, plumbing, and electrical companies", pe: "Palladin Consumer Retail Partners" },
  { platform: "Master Trades Group", location: "Baltimore, MD", description: "Residential services platform specializing in plumbing and HVAC services", pe: "L Catterton" },
  { platform: "Creative Service Partners", location: "Atlanta, GA", description: "Provider of essential home and multifamily services including plumbing, jetting, HVAC, electrical, and mitigation", pe: "Trivest Partners" },
  { platform: "Clarion Home Services Group", location: "Chicago, IL", description: "Multi-brand residential HVAC, electrical, and plumbing services growth platform", pe: "LightBay Capital" },
  { platform: "Goettl", location: "Las Vegas, NV", description: "Provider of residential HVAC and plumbing maintenance, repair, and replacement services", pe: "Cortec Group" },
  { platform: "Royal House Partners", location: "Dallas, TX", description: "Residential and light commercial home services platform focused on HVAC, plumbing, and electrical services", pe: "Independent" },
];

// Extract state from location string
function extractState(location: string): string[] {
  const stateMatch = location.match(/([A-Z]{2}),?\s*(United States|Canada)?/);
  if (stateMatch) return [stateMatch[1]];
  if (location.includes("United States")) return ["National"];
  return [];
}

// Generate sample intelligence for some buyers
function generateIntelligence(index: number) {
  const hasIntelligence = index < 10; // First 10 buyers have intelligence
  if (!hasIntelligence) return {};
  
  const minRevenues = [3, 5, 4, 2, 5, 3, 4, 5, 3, 4];
  const maxRevenues = [15, 25, 20, 10, 30, 15, 20, 25, 15, 20];
  const ebitdas = [18, 20, 15, 18, 22, 20, 18, 20, 15, 18];
  const confidences = ["High", "Medium", "High", "High", "Medium", "High", "Medium", "High", "Medium", "High"];
  
  const dealBreakers = [
    ["Franchise models", "West Coast"],
    ["Under $5M revenue"],
    ["Commercial only"],
    [],
    ["No add-ons", "Under $10M EBITDA"],
    ["Franchise"],
    [],
    ["Commercial-focused"],
    ["No residential"],
    [],
  ];

  const thesisSummaries = [
    "Focused on residential HVAC in Southeast and Mid-Atlantic. Looking for platforms with strong recurring service revenue.",
    "Aggressive acquirer seeking add-ons nationwide. Prefers residential-focused with $5-25M revenue range.",
    "Building a national platform through tuck-in acquisitions. Strong preference for residential HVAC with plumbing capabilities.",
    "Seeking smaller add-ons to complement existing Southeast footprint. Flexible on geography.",
    "Large-scale acquirer with significant capital. Looking for transformative platform deals or larger add-ons.",
    "Active acquirer in the residential services space. Prefers established brands with strong local reputation.",
    "Mid-market focused, seeking HVAC companies with expansion potential in underserved markets.",
    "Building a West Coast presence. Looking for residential HVAC with strong commercial potential.",
    "Active in Mid-Atlantic region. Seeking companies with strong management teams willing to stay post-acquisition.",
    "National buyer with multiple platforms. Looking for regional leaders in HVAC and home services.",
  ];

  return {
    thesis_summary: thesisSummaries[index],
    min_revenue: minRevenues[index],
    max_revenue: maxRevenues[index],
    preferred_ebitda: ebitdas[index],
    thesis_confidence: confidences[index],
    deal_breakers: dealBreakers[index],
    service_mix_prefs: "Residential HVAC, plumbing a plus",
  };
}

// Generate a valid UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function seedSampleData() {
  // Check if data already exists
  const { data: existingTrackers } = await supabase
    .from("industry_trackers")
    .select("id")
    .eq("industry_name", "Residential HVAC")
    .limit(1);

  if (existingTrackers && existingTrackers.length > 0) {
    console.log("Sample data already exists");
    return existingTrackers[0].id;
  }

  // Create the industry tracker with a generated UUID for user_id
  const { data: tracker, error: trackerError } = await supabase
    .from("industry_trackers")
    .insert({
      industry_name: "Residential HVAC",
      user_id: generateUUID(),
    })
    .select()
    .single();

  if (trackerError) {
    console.error("Error creating tracker:", trackerError);
    throw trackerError;
  }

  // Create buyers
  const buyersToInsert = sampleBuyers.map((buyer, index) => ({
    tracker_id: tracker.id,
    pe_firm_name: buyer.pe,
    platform_company_name: buyer.platform,
    services_offered: buyer.description,
    geographic_footprint: extractState(buyer.location),
    business_model: "Corporate",
    ...generateIntelligence(index),
  }));

  const { error: buyersError } = await supabase
    .from("buyers")
    .insert(buyersToInsert);

  if (buyersError) {
    console.error("Error creating buyers:", buyersError);
    throw buyersError;
  }

  console.log("Sample data seeded successfully");
  return tracker.id;
}
