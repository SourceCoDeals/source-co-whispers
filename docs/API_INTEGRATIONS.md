# API Integrations

## Overview

SourceCo integrates with external services for AI processing, web scraping, and backend infrastructure. This document details each integration.

---

## AI Providers

### Claude (Anthropic)

**Purpose:** Primary AI for complex extraction, scoring explanations, and content generation.

**Model:** `claude-sonnet-4-20250514`

**Authentication:**
```typescript
// Edge function environment
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
```

**Request Format:**
```typescript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: "System prompt here...",
    messages: [
      { role: "user", content: "User message..." }
    ]
  })
});
```

**Tool Calling (Structured Output):**
```typescript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    tools: [
      {
        name: "extract_criteria",
        description: "Extract structured criteria from text",
        input_schema: {
          type: "object",
          properties: {
            size_criteria: {
              type: "object",
              properties: {
                min_revenue: { type: "number" },
                max_revenue: { type: "number" }
              }
            },
            geography_criteria: {
              type: "object",
              properties: {
                preferred_states: { 
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          }
        }
      }
    ],
    tool_choice: { type: "tool", name: "extract_criteria" },
    messages: [
      { role: "user", content: "Parse this criteria: Looking for $2-10M revenue shops in Texas..." }
    ]
  })
});
```

**Used By:**
- enrich-buyer (6 extraction prompts)
- enrich-deal
- extract-deal-transcript
- extract-transcript
- score-buyer-deal (explanations)
- parse-fit-criteria
- generate-ma-guide

**Rate Limits:**
- 1000 requests/minute (standard tier)
- Token limits vary by model

**Error Handling:**
```typescript
try {
  const response = await fetchClaude(prompt);
  if (response.status === 429) {
    // Rate limited - implement backoff
    await sleep(retryDelay * Math.pow(2, attempt));
    continue;
  }
  if (response.status >= 500) {
    // Server error - retry
    continue;
  }
} catch (error) {
  console.error("Claude API error:", error);
  throw new Error("AI extraction failed");
}
```

---

### Lovable AI Gateway

**Purpose:** Simplified AI access for chat interfaces and lighter processing.

**Endpoint:** `https://ai.gateway.lovable.dev/v1/chat/completions`

**Authentication:**
```typescript
// Auto-provisioned in Supabase environment
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
```

**Available Models:**
| Model | Use Case |
|-------|----------|
| google/gemini-3-flash-preview | Default - fast, balanced |
| google/gemini-2.5-pro | Complex reasoning, multimodal |
| google/gemini-2.5-flash | Cost-effective, good quality |
| openai/gpt-5 | High accuracy, nuanced |
| openai/gpt-5-mini | Balance of cost and quality |

**Request Format:**
```typescript
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: "You are a helpful M&A analyst..." },
      { role: "user", content: "Show me buyers in Texas..." }
    ],
    stream: true
  })
});
```

**Streaming Response Handling:**
```typescript
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  buffer += decoder.decode(value, { stream: true });
  
  // Process SSE lines
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";
  
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      
      const parsed = JSON.parse(data);
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) {
        // Emit token to client
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
      }
    }
  }
}
```

**Used By:**
- query-buyer-universe
- query-tracker-universe
- update-fit-criteria-chat
- parse-scoring-instructions

**Rate Limits:**
- Per-workspace limits
- 429 response when exceeded
- 402 response when credits exhausted

---

## Web Scraping

### Firecrawl

**Purpose:** Extract content from websites for enrichment.

**Endpoint:** `https://api.firecrawl.dev/v0/scrape`

**Authentication:**
```typescript
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
```

**Request Format:**
```typescript
const response = await fetch("https://api.firecrawl.dev/v0/scrape", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    url: "https://example-pe.com",
    formats: ["markdown", "html"],
    onlyMainContent: true,
    waitFor: 3000
  })
});
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "markdown": "# Company Name\n\nAbout us...",
    "html": "<html>...",
    "metadata": {
      "title": "Page Title",
      "description": "Meta description"
    }
  }
}
```

**Used By:**
- enrich-buyer (PE firm + platform websites)
- enrich-deal (company websites)
- firecrawl-scrape (generic wrapper)

**Rate Limits:**
- 100 requests/minute
- Implement backoff on 429 responses

**Error Handling:**
```typescript
const scrapeWithRetry = async (url: string, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch("https://api.firecrawl.dev/v0/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url, formats: ["markdown"] })
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status === 429) {
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
      
      throw new Error(`Scrape failed: ${response.status}`);
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, attempt));
    }
  }
};
```

---

## Backend Infrastructure

### Supabase

**Purpose:** Complete backend infrastructure including database, auth, storage, and edge functions.

**Components:**

#### Database (PostgreSQL)
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Query example
const { data, error } = await supabase
  .from("buyers")
  .select("*")
  .eq("tracker_id", trackerId);
```

#### Storage
```typescript
// Upload file
const { data, error } = await supabase.storage
  .from("tracker-documents")
  .upload(`${trackerId}/${filename}`, file);

// Get signed URL
const { data } = await supabase.storage
  .from("tracker-documents")
  .createSignedUrl(`${trackerId}/${filename}`, 3600);
```

#### Edge Functions
```typescript
// supabase/functions/my-function/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { param1, param2 } = await req.json();
    // Process request
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
```

#### Authentication
```typescript
// Client-side
import { supabase } from "@/integrations/supabase/client";

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "password123"
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password123"
});

// Get session
const { data: { session } } = await supabase.auth.getSession();
```

---

## Environment Variables

### Frontend (.env)
```bash
# Auto-generated by Supabase integration
VITE_SUPABASE_URL=https://gsvsyqjgtjuzrgxqkvxw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_SUPABASE_PROJECT_ID=gsvsyqjgtjuzrgxqkvxw
```

### Edge Functions (Supabase Secrets)
```bash
# Required secrets
ANTHROPIC_API_KEY=sk-ant-...
FIRECRAWL_API_KEY=fc-...
LOVABLE_API_KEY=lv-...

# Auto-provisioned
SUPABASE_URL=https://gsvsyqjgtjuzrgxqkvxw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

---

## API Error Codes

### Common Error Responses

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Check API key |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Check endpoint/resource |
| 429 | Rate Limited | Implement backoff |
| 500 | Server Error | Retry with backoff |
| 502 | Bad Gateway | Retry |
| 503 | Service Unavailable | Retry later |

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  code?: string;
  details?: string;
  retryAfter?: number;
}
```

---

## Retry Strategy

### Exponential Backoff Implementation

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableStatuses: [429, 500, 502, 503, 504]
};

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      if (!config.retryableStatuses.includes(response.status)) {
        return response; // Non-retryable error
      }
      
      // Calculate delay with jitter
      const delay = Math.min(
        config.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        config.maxDelay
      );
      
      console.log(`Retry ${attempt + 1}/${config.maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === config.maxRetries - 1) {
        throw lastError;
      }
      
      const delay = config.baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error("Max retries exceeded");
}
```

---

## Security Considerations

### API Key Storage
- Never expose API keys in frontend code
- Store in Supabase Vault/Secrets
- Access only via edge functions

### Request Validation
```typescript
// Validate required fields
const { buyerId, transcriptText } = await req.json();

if (!buyerId || typeof buyerId !== "string") {
  return new Response(
    JSON.stringify({ error: "buyerId is required" }),
    { status: 400, headers: corsHeaders }
  );
}

// Validate UUID format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!UUID_REGEX.test(buyerId)) {
  return new Response(
    JSON.stringify({ error: "Invalid buyerId format" }),
    { status: 400, headers: corsHeaders }
  );
}
```

### Rate Limiting (Client-Side)
```typescript
class RateLimiter {
  private queue: (() => Promise<any>)[] = [];
  private running = 0;
  private maxConcurrent: number;
  private minDelay: number;
  private lastRequest = 0;
  
  constructor(maxConcurrent = 5, minDelay = 200) {
    this.maxConcurrent = maxConcurrent;
    this.minDelay = minDelay;
  }
  
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }
  
  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.minDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minDelay - timeSinceLastRequest)
      );
    }
    
    this.running++;
    this.lastRequest = Date.now();
    
    const fn = this.queue.shift()!;
    try {
      await fn();
    } finally {
      this.running--;
      this.process();
    }
  }
}
```

---

## Monitoring and Logging

### Edge Function Logging
```typescript
// Structured logging
console.log(JSON.stringify({
  level: "info",
  function: "enrich-buyer",
  buyerId,
  action: "started",
  timestamp: new Date().toISOString()
}));

// Error logging
console.error(JSON.stringify({
  level: "error",
  function: "enrich-buyer",
  buyerId,
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
}));
```

### Health Checks
```typescript
// Simple health check endpoint
serve(async (req) => {
  if (req.url.endsWith("/health")) {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" }
    });
  }
  // ... rest of function
});
```
