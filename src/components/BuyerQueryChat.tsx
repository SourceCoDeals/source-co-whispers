import { useState, useRef, useEffect, useMemo } from "react";
import { MessageSquare, Send, X, Sparkles, Loader2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface BuyerQueryChatProps {
  dealId: string;
  dealName: string;
  onHighlightBuyers?: (buyerIds: string[]) => void;
  onBuyerClick?: (buyerName: string) => void;
  approvedCount?: number;
  passedCount?: number;
  pendingCount?: number;
}

// Extract buyer IDs from the hidden marker in AI response
function extractBuyerIds(content: string): string[] {
  const match = content.match(/<!-- BUYER_HIGHLIGHT: \[(.*?)\] -->/);
  if (!match) return [];
  try {
    const idsStr = `[${match[1]}]`;
    return JSON.parse(idsStr);
  } catch {
    return [];
  }
}

// Remove the hidden marker from displayed content
function cleanContent(content: string): string {
  return content.replace(/<!-- BUYER_HIGHLIGHT: \[.*?\] -->/g, '').trim();
}

// Generate context-aware example queries
function generateExampleQueries(dealName: string, counts: { approved: number; passed: number; pending: number }): string[] {
  const queries = [
    "Who are the top 5 highest scoring buyers?",
    `Which buyers have the best geography fit for ${dealName}?`,
  ];
  
  if (counts.approved > 0) {
    queries.push("Show me already approved buyers and why they were selected");
  }
  
  if (counts.pending > 5) {
    queries.push("Which pending buyers should I prioritize next?");
  }
  
  queries.push("Compare the top 3 buyers by all scoring categories");
  queries.push("Who are the decision makers at the highest-scoring buyers?");
  
  return queries.slice(0, 5);
}

// Parse and render message content with clickable buyer names
function renderMessageContent(
  content: string, 
  onBuyerClick?: (name: string) => void
): React.ReactNode {
  const cleanedContent = cleanContent(content);
  
  // Split by bold markers **name** and make them clickable
  const parts = cleanedContent.split(/(\*\*[^*]+\*\*)/g);
  
  return parts.map((part, i) => {
    const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch && onBuyerClick) {
      const name = boldMatch[1];
      return (
        <button
          key={i}
          className="font-semibold text-primary hover:underline cursor-pointer"
          onClick={() => onBuyerClick(name)}
        >
          {name}
        </button>
      );
    }
    // Handle regular text - preserve whitespace and newlines
    return <span key={i}>{part}</span>;
  });
}

export function BuyerQueryChat({ 
  dealId, 
  dealName, 
  onHighlightBuyers,
  onBuyerClick,
  approvedCount = 0,
  passedCount = 0,
  pendingCount = 0,
}: BuyerQueryChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [accumulateHighlights, setAccumulateHighlights] = useState(false);
  const [currentHighlights, setCurrentHighlights] = useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const exampleQueries = useMemo(() => 
    generateExampleQueries(dealName, { approved: approvedCount, passed: passedCount, pending: pendingCount }),
    [dealName, approvedCount, passedCount, pendingCount]
  );

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/query-buyer-universe`;

      // Get the current session token for authenticated requests
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("You must be logged in to use this feature");
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          dealId,
          query: messageText,
          messages: [...messages, userMsg],
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {
            /* ignore partial leftovers */
          }
        }
      }
      
      // Extract and highlight buyer IDs after streaming completes
      if (onHighlightBuyers && assistantContent) {
        const newBuyerIds = extractBuyerIds(assistantContent);
        if (newBuyerIds.length > 0) {
          if (accumulateHighlights) {
            const combined = [...new Set([...currentHighlights, ...newBuyerIds])];
            setCurrentHighlights(combined);
            onHighlightBuyers(combined);
          } else {
            setCurrentHighlights(newBuyerIds);
            onHighlightBuyers(newBuyerIds);
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleExampleClick = (query: string) => {
    sendMessage(query);
  };

  const clearHighlights = () => {
    setCurrentHighlights([]);
    onHighlightBuyers?.([]);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[420px] h-[600px] bg-background border rounded-lg shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">Buyer Intelligence</h3>
            <p className="text-xs text-muted-foreground">Ask about {dealName}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Highlight Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/10">
        <div className="flex items-center gap-2">
          <Switch 
            id="accumulate"
            checked={accumulateHighlights} 
            onCheckedChange={setAccumulateHighlights}
          />
          <label htmlFor="accumulate" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
            <Layers className="h-3 w-3" />
            Stack highlights
          </label>
        </div>
        {currentHighlights.length > 0 && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearHighlights}>
            Clear ({currentHighlights.length})
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center py-4">
              Ask questions about your buyer universe. I can help you find buyers
              by geography, scores, acquisition criteria, and more.
            </p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Try asking:
              </p>
              {exampleQueries.map((query, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(query)}
                  className="w-full text-left p-3 text-sm bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-4 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <div className="whitespace-pre-wrap">
                    {msg.role === "assistant" 
                      ? renderMessageContent(msg.content, onBuyerClick)
                      : msg.content
                    }
                  </div>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyzing buyer universe...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about buyers..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
