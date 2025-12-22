import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FileText,
  Plus,
  Link2,
  Upload,
  Trash2,
  Sparkles,
  Loader2,
  ExternalLink,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

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

  const addTranscriptLink = async () => {
    if (!newTranscript.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    
    const { error } = await supabase.from("deal_transcripts").insert({
      deal_id: dealId,
      title: newTranscript.title,
      url: newTranscript.url,
      notes: newTranscript.notes,
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
      title: file.name,
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

  const processTranscriptWithAI = async (transcriptId: string) => {
    setProcessingTranscripts((prev) => new Set(prev).add(transcriptId));
    
    try {
      const { data, error } = await supabase.functions.invoke("extract-deal-transcript", {
        body: { transcriptId },
      });
      
      if (error) {
        toast({ title: "Processing failed", description: error.message, variant: "destructive" });
        return;
      }
      
      if (data?.success) {
        toast({
          title: "Extraction complete",
          description: `Updated ${data.extractedFields?.length || 0} fields from transcript.`,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          <h3 className="font-semibold">Call Transcripts</h3>
          {transcripts.length > 0 && (
            <Badge variant="secondary">{transcripts.length}</Badge>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" /> Add Transcript
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Transcript</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="link" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="link">
                  <Link2 className="w-4 h-4 mr-2" /> Link
                </TabsTrigger>
                <TabsTrigger value="upload">
                  <Upload className="w-4 h-4 mr-2" /> Upload
                </TabsTrigger>
              </TabsList>
              <TabsContent value="link" className="space-y-4 mt-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    placeholder="Discovery Call - Jan 15"
                    value={newTranscript.title}
                    onChange={(e) =>
                      setNewTranscript({ ...newTranscript, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>URL</Label>
                  <Input
                    placeholder="https://docs.google.com/..."
                    value={newTranscript.url}
                    onChange={(e) =>
                      setNewTranscript({ ...newTranscript, url: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Call Date</Label>
                  <Input
                    type="date"
                    value={newTranscript.call_date}
                    onChange={(e) =>
                      setNewTranscript({ ...newTranscript, call_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Key takeaways..."
                    value={newTranscript.notes}
                    onChange={(e) =>
                      setNewTranscript({ ...newTranscript, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <Button onClick={addTranscriptLink} className="w-full">
                  Add Link
                </Button>
              </TabsContent>
              <TabsContent value="upload" className="space-y-4 mt-4">
                <div>
                  <Label>Call Date (optional)</Label>
                  <Input
                    type="date"
                    value={newTranscript.call_date}
                    onChange={(e) =>
                      setNewTranscript({ ...newTranscript, call_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Upload File (PDF, TXT, DOCX)</Label>
                  <Input
                    type="file"
                    accept=".pdf,.txt,.docx,.doc"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="mt-2"
                  />
                </div>
                {isUploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {transcripts.length === 0 ? (
        <Card className="p-4 text-center text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No transcripts added yet</p>
          <p className="text-xs mt-1">Add a link or upload a file to get started</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {transcripts.map((transcript) => {
            const status = getStatus(transcript);
            const isExpanded = expandedTranscripts.has(transcript.id);
            const url = getTranscriptUrl(transcript);

            return (
              <Card key={transcript.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {transcript.title}
                      </span>
                      <Badge
                        variant={
                          transcript.transcript_type === "file"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {transcript.transcript_type === "file" ? "File" : "Link"}
                      </Badge>
                      {status === "extracted" && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" /> Extracted
                        </Badge>
                      )}
                      {status === "processing" && (
                        <Badge variant="secondary" className="text-xs">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing
                        </Badge>
                      )}
                      {status === "pending" && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" /> Pending
                        </Badge>
                      )}
                    </div>
                    {transcript.call_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Call: {format(new Date(transcript.call_date), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {url && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        asChild
                      >
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => processTranscriptWithAI(transcript.id)}
                      disabled={status === "processing"}
                    >
                      {status === "processing" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteTranscript(transcript)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {transcript.extracted_data &&
                      Object.keys(transcript.extracted_data).length > 0 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => toggleExpanded(transcript.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                  </div>
                </div>

                {isExpanded && transcript.extracted_data && (
                  <Collapsible open={isExpanded}>
                    <CollapsibleContent className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">
                        Extracted Data:
                      </p>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
                        {JSON.stringify(transcript.extracted_data, null, 2)}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
