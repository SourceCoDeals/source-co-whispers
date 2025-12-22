import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Plus,
  Link2,
  Upload,
  Trash2,
  Sparkles,
  Loader2,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";

interface DealTranscript {
  id: string;
  deal_id: string;
  title: string;
  transcript_type: string;
  url: string | null;
  notes: string | null;
  call_date: string | null;
  created_at: string;
  extracted_data: any;
  extraction_evidence: any;
  processed_at: string | null;
}

interface DealTranscriptsSectionProps {
  dealId: string;
  transcripts: DealTranscript[];
  onDataChange: () => void;
}

export function DealTranscriptsSection({
  dealId,
  transcripts,
  onDataChange,
}: DealTranscriptsSectionProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTranscript, setNewTranscript] = useState({
    title: "",
    url: "",
    notes: "",
    call_date: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [processingTranscripts, setProcessingTranscripts] = useState<Set<string>>(new Set());
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<string>>(new Set());
  const [isReextractingAll, setIsReextractingAll] = useState(false);

  const addTranscriptLink = async () => {
    if (!newTranscript.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    
    const { error } = await supabase.from("deal_transcripts").insert({
      deal_id: dealId,
      title: newTranscript.title,
      url: newTranscript.url || null,
      notes: newTranscript.notes || null,
      call_date: newTranscript.call_date || null,
      transcript_type: "link",
    });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    
    toast({ title: "Transcript link added" });
    setNewTranscript({ title: "", url: "", notes: "", call_date: "" });
    setDialogOpen(false);
    onDataChange();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Upload failed", description: "You must be logged in", variant: "destructive" });
      setIsUploading(false);
      return;
    }
    
    const fileName = `${user.id}/${dealId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("deal-transcripts")
      .upload(fileName, file);
    
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setIsUploading(false);
      return;
    }
    
    const { error: dbError } = await supabase.from("deal_transcripts").insert({
      deal_id: dealId,
      title: newTranscript.title || file.name,
      url: fileName,
      transcript_type: "file",
      call_date: newTranscript.call_date || null,
    });
    
    if (dbError) {
      toast({ title: "Error", description: dbError.message, variant: "destructive" });
    } else {
      toast({ title: "Transcript uploaded" });
    }
    
    setIsUploading(false);
    setDialogOpen(false);
    setNewTranscript({ title: "", url: "", notes: "", call_date: "" });
    onDataChange();
  };

  const deleteTranscript = async (transcript: DealTranscript) => {
    if (transcript.transcript_type === "file" && transcript.url) {
      await supabase.storage.from("deal-transcripts").remove([transcript.url]);
    }
    await supabase.from("deal_transcripts").delete().eq("id", transcript.id);
    toast({ title: "Transcript removed" });
    onDataChange();
  };

  const getTranscriptUrl = (transcript: DealTranscript) => {
    if (transcript.transcript_type === "link") return transcript.url;
    if (!transcript.url) return null;
    const { data } = supabase.storage.from("deal-transcripts").getPublicUrl(transcript.url);
    return data.publicUrl;
  };

  const processTranscriptWithAI = async (transcriptId: string, applyToDeal: boolean = false) => {
    setProcessingTranscripts((prev) => new Set(prev).add(transcriptId));
    
    try {
      const { data, error } = await supabase.functions.invoke("extract-deal-transcript", {
        body: { transcriptId, applyToDeal },
      });
      
      if (error) {
        toast({ title: "Processing failed", description: error.message, variant: "destructive" });
        return;
      }

      if (data?.needsContent) {
        toast({ 
          title: "Insufficient content", 
          description: "Please add detailed notes to the transcript before processing.",
          variant: "destructive" 
        });
        return;
      }
      
      if (data?.success) {
        toast({
          title: applyToDeal ? "Applied to deal" : "Extraction complete",
          description: data.message || `Updated ${data.extractedFields?.length || 0} fields from transcript.`,
        });
        onDataChange();
        setExpandedTranscripts((prev) => new Set(prev).add(transcriptId));
      } else {
        toast({ title: "Processing failed", description: data?.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to process transcript", variant: "destructive" });
    } finally {
      setProcessingTranscripts((prev) => {
        const next = new Set(prev);
        next.delete(transcriptId);
        return next;
      });
    }
  };

  const reextractAllTranscripts = async () => {
    const transcriptsWithContent = transcripts.filter(t => t.notes && t.notes.length > 50);
    
    if (transcriptsWithContent.length === 0) {
      toast({ 
        title: "No transcripts to process", 
        description: "Add transcript content/notes before re-extracting.",
        variant: "destructive" 
      });
      return;
    }

    setIsReextractingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const transcript of transcriptsWithContent) {
      try {
        setProcessingTranscripts(prev => new Set(prev).add(transcript.id));
        
        const { data, error } = await supabase.functions.invoke('extract-deal-transcript', {
          body: { transcriptId: transcript.id, applyToDeal: true }
        });

        if (error || !data?.success) {
          errorCount++;
        } else {
          successCount++;
        }
      } catch {
        errorCount++;
      } finally {
        setProcessingTranscripts(prev => {
          const next = new Set(prev);
          next.delete(transcript.id);
          return next;
        });
      }
    }

    setIsReextractingAll(false);
    onDataChange();
    
    toast({
      title: "Re-extraction complete",
      description: `Processed ${successCount} transcript${successCount !== 1 ? 's' : ''} successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedTranscripts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatus = (transcript: DealTranscript) => {
    if (processingTranscripts.has(transcript.id)) return "processing";
    if (transcript.processed_at) return "extracted";
    return "pending";
  };

  const transcriptsWithContent = transcripts.filter(t => t.notes && t.notes.length > 50);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Call Transcripts</h3>
          {transcripts.length > 0 && (
            <Badge variant="secondary">{transcripts.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {transcriptsWithContent.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={reextractAllTranscripts}
              disabled={isReextractingAll}
            >
              {isReextractingAll ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Re-extract All ({transcriptsWithContent.length})
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" /> Add Transcript
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Call Transcript</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g., Discovery Call - Jan 15"
                    value={newTranscript.title}
                    onChange={(e) =>
                      setNewTranscript({ ...newTranscript, title: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Transcript Link URL</Label>
                  <Input
                    placeholder="https://docs.google.com/... or https://..."
                    value={newTranscript.url}
                    onChange={(e) =>
                      setNewTranscript({ ...newTranscript, url: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Notes / Transcript Content</Label>
                  <Textarea
                    placeholder="Paste transcript content here for AI extraction, or add key takeaways and notes..."
                    value={newTranscript.notes}
                    onChange={(e) =>
                      setNewTranscript({ ...newTranscript, notes: e.target.value })
                    }
                    rows={6}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tip: Paste the full transcript here for best AI extraction results
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Call Date (optional)</Label>
                  <Input
                    type="date"
                    value={newTranscript.call_date}
                    onChange={(e) =>
                      setNewTranscript({ ...newTranscript, call_date: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={addTranscriptLink}
                    disabled={!newTranscript.title.trim()}
                    className="flex-1"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Add Transcript Link
                  </Button>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or upload file instead
                    </span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="transcript-upload" className="cursor-pointer">
                    <div
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                        !newTranscript.title.trim()
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-primary/50 cursor-pointer"
                      }`}
                    >
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload transcript file
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            (Title required first)
                          </p>
                        </>
                      )}
                    </div>
                  </Label>
                  <input
                    id="transcript-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.txt,.md"
                    disabled={!newTranscript.title.trim()}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {transcripts.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No transcripts linked yet.
        </p>
      ) : (
        <div className="space-y-3">
          {transcripts.map((t) => {
            const status = getStatus(t);
            const isExpanded = expandedTranscripts.has(t.id);
            const extractedData = t.extracted_data || {};
            const hasExtractedData = Object.keys(extractedData).length > 0;
            const url = getTranscriptUrl(t);

            return (
              <div key={t.id} className="bg-muted/50 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:text-primary hover:underline truncate"
                          >
                            {t.title}
                          </a>
                        ) : (
                          <span className="font-medium truncate">{t.title}</span>
                        )}
                        {status === "extracted" && (
                          <Badge
                            variant="outline"
                            className="bg-green-500/10 text-green-600 border-green-500/30 shrink-0"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Extracted
                          </Badge>
                        )}
                        {status === "processing" && (
                          <Badge
                            variant="outline"
                            className="bg-blue-500/10 text-blue-600 border-blue-500/30 shrink-0"
                          >
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Processing
                          </Badge>
                        )}
                        {status === "pending" && (
                          <Badge variant="outline" className="shrink-0">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {t.call_date && (
                          <span>{new Date(t.call_date).toLocaleDateString()}</span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {t.transcript_type === "file" ? "Uploaded" : "Link"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => processTranscriptWithAI(t.id, false)}
                        disabled={processingTranscripts.has(t.id)}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Process AI
                      </Button>
                    )}
                    {status === "extracted" && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => processTranscriptWithAI(t.id, true)}
                          disabled={processingTranscripts.has(t.id)}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Apply to Deal
                        </Button>
                        {hasExtractedData && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleExpanded(t.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTranscript(t)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded extracted data preview */}
                {isExpanded && hasExtractedData && (
                  <div className="border-t px-4 py-3 bg-background/50">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">
                      Extracted Data Preview
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {extractedData.company_overview && (
                        <div className="md:col-span-2">
                          <p className="text-xs text-muted-foreground">Company Overview</p>
                          <p className="text-sm">
                            {typeof extractedData.company_overview === 'object' 
                              ? extractedData.company_overview.value 
                              : extractedData.company_overview}
                          </p>
                        </div>
                      )}
                      {extractedData.revenue && (
                        <div>
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <p className="text-sm">
                            ${typeof extractedData.revenue === 'object' 
                              ? extractedData.revenue.value 
                              : extractedData.revenue}M
                          </p>
                        </div>
                      )}
                      {extractedData.ebitda_amount && (
                        <div>
                          <p className="text-xs text-muted-foreground">EBITDA</p>
                          <p className="text-sm">
                            ${typeof extractedData.ebitda_amount === 'object' 
                              ? extractedData.ebitda_amount.value 
                              : extractedData.ebitda_amount}M
                          </p>
                        </div>
                      )}
                      {extractedData.geography?.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground">Geography</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {extractedData.geography.map((g: any, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {typeof g === 'object' ? g.value || JSON.stringify(g) : g}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {extractedData.service_mix && (
                        <div>
                          <p className="text-xs text-muted-foreground">Service Mix</p>
                          <p className="text-sm">
                            {typeof extractedData.service_mix === 'object' 
                              ? extractedData.service_mix.value 
                              : extractedData.service_mix}
                          </p>
                        </div>
                      )}
                      {extractedData.owner_goals && (
                        <div className="md:col-span-2">
                          <p className="text-xs text-muted-foreground">Owner Goals</p>
                          <p className="text-sm">
                            {typeof extractedData.owner_goals === 'object' 
                              ? extractedData.owner_goals.value 
                              : extractedData.owner_goals}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {t.notes && !isExpanded && (
                  <div className="px-4 pb-3">
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
