// All valid US state abbreviations
export const ALL_US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY'
];

// Map full state names to abbreviations
const STATE_NAME_TO_ABBREV: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'district of columbia': 'DC', 'florida': 'FL',
  'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN',
  'iowa': 'IA', 'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME',
  'maryland': 'MD', 'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH',
  'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  'ohio': 'OH', 'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
};

// Common misspellings
const MISSPELLINGS: Record<string, string> = {
  'conneticut': 'CT', 'conecticut': 'CT', 'conneticutt': 'CT',
  'massachusets': 'MA', 'massachussetts': 'MA', 'massachucetts': 'MA',
  'pennsilvania': 'PA', 'pensylvania': 'PA',
  'tennesee': 'TN', 'tennesse': 'TN',
  'missisipi': 'MS', 'mississipi': 'MS', 'missisippi': 'MS',
  'louisianna': 'LA', 'lousiana': 'LA',
  'virgina': 'VA',
  'north carolia': 'NC', 'n carolina': 'NC', 'n. carolina': 'NC',
  'south carolia': 'SC', 's carolina': 'SC', 's. carolina': 'SC',
  'west virgina': 'WV', 'w virginia': 'WV', 'w. virginia': 'WV',
  'new jersery': 'NJ',
};

// Patterns to skip - UI text, URLs, garbage data
const SKIP_PATTERNS = [
  /find\s*(a\s*)?shop/i,
  /near\s*(you|me)/i,
  /body-shop/i,
  /locations?$/i,
  /^https?:\/\//i,
  /\.com/i,
  /\.net/i,
  /\.org/i,
  /click\s*here/i,
  /learn\s*more/i,
  /view\s*all/i,
  /see\s*all/i,
  /^\d+\s*\d*\s*\d*\s*\d*\s*\d*\s*\d*$/, // Just numbers
];

/**
 * Normalize geography input to standardized 2-letter US state abbreviations.
 * Handles various input formats:
 * - Full state names (California → CA)
 * - Misspellings (Conneticut → CT)
 * - City, State format (Jackson, Mississippi → MS)
 * - Descriptive text (Jackson, Mississippi (and 5 surrounding towns) → MS)
 * - Space-separated abbreviations (TX OK AR LA → [TX, OK, AR, LA])
 * - National/Nationwide/USA → All 50 states
 * - "X states" patterns (41 states → All 50 if ≥30)
 */
export function normalizeGeography(input: string[] | string | null | undefined): string[] {
  if (!input) return [];
  
  // Convert string input to array
  const items = typeof input === 'string' 
    ? input.split(',').map(s => s.trim()).filter(Boolean)
    : input;
  
  if (!Array.isArray(items) || items.length === 0) return [];

  const normalized: string[] = [];
  
  for (const item of items) {
    if (!item || typeof item !== 'string') continue;
    
    const trimmed = item.trim();
    const upper = trimmed.toUpperCase();
    const lower = trimmed.toLowerCase();
    
    // Skip garbage data patterns
    if (SKIP_PATTERNS.some(pattern => pattern.test(trimmed))) {
      console.log(`[normalizeGeography] Skipping garbage: "${item}"`);
      continue;
    }
    
    // Skip very short or very long entries
    if (trimmed.length < 2 || trimmed.length > 100) {
      continue;
    }
    
    // Check if already valid 2-letter abbreviation
    if (ALL_US_STATES.includes(upper)) {
      normalized.push(upper);
      continue;
    }
    
    // Convert full state name to abbreviation
    const abbrev = STATE_NAME_TO_ABBREV[lower];
    if (abbrev) {
      normalized.push(abbrev);
      continue;
    }
    
    // Handle common misspellings
    if (MISSPELLINGS[lower]) {
      console.log(`[normalizeGeography] Fixed misspelling: "${item}" → "${MISSPELLINGS[lower]}"`);
      normalized.push(MISSPELLINGS[lower]);
      continue;
    }
    
    // "national"/"nationwide"/"USA" → all 50 states
    if (['national', 'nationwide', 'usa', 'us', 'united states', 'all states'].includes(lower)) {
      console.log(`[normalizeGeography] Expanding "${item}" to all 50 states`);
      normalized.push(...ALL_US_STATES);
      continue;
    }
    
    // Handle "X states" pattern (e.g., "41 states", "50 states")
    const statesMatch = lower.match(/^(\d+)\s*states?$/);
    if (statesMatch) {
      const count = parseInt(statesMatch[1], 10);
      if (count >= 30) {
        console.log(`[normalizeGeography] Expanding "${item}" (${count} states) to all 50`);
        normalized.push(...ALL_US_STATES);
        continue;
      }
      // Less than 30 - skip, we need specific states
      continue;
    }
    
    // Handle "City, State" format with full state name (e.g., "Jackson, Mississippi")
    const cityFullStateMatch = trimmed.match(/,\s*([A-Za-z\s]+)$/);
    if (cityFullStateMatch) {
      const statePart = cityFullStateMatch[1].trim().toLowerCase();
      // Remove parenthetical text like "(and 5 surrounding towns)"
      const cleanedState = statePart.replace(/\s*\([^)]*\)\s*/g, '').trim();
      
      // Check if it's a 2-letter abbreviation
      if (cleanedState.length === 2 && ALL_US_STATES.includes(cleanedState.toUpperCase())) {
        normalized.push(cleanedState.toUpperCase());
        continue;
      }
      
      // Check if it's a full state name
      const stateAbbrev = STATE_NAME_TO_ABBREV[cleanedState];
      if (stateAbbrev) {
        console.log(`[normalizeGeography] Extracted "${stateAbbrev}" from "${item}"`);
        normalized.push(stateAbbrev);
        continue;
      }
    }
    
    // Handle space-separated abbreviations (e.g., "TX OK AR LA")
    if (/^[A-Z]{2}(\s+[A-Z]{2})+$/i.test(trimmed)) {
      const parts = upper.split(/\s+/);
      let allValid = true;
      for (const part of parts) {
        if (ALL_US_STATES.includes(part)) {
          normalized.push(part);
        } else {
          allValid = false;
        }
      }
      if (allValid && parts.length > 1) {
        console.log(`[normalizeGeography] Parsed space-separated from "${item}"`);
        continue;
      }
    }
    
    // Skip invalid entries
    console.warn(`[normalizeGeography] Skipping invalid: "${item}"`);
  }
  
  // Remove duplicates and return sorted
  const unique = [...new Set(normalized)];
  return unique.sort();
}
