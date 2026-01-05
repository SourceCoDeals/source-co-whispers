import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BuyerDataSection } from "@/components/BuyerDataSection";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Link2, Upload, Trash2, FileText, Sparkles, CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface BuyerTranscriptsSectionProps {
  buyerId: string;
  transcripts: any[];
  onRefresh: () => void;
}

export function BuyerTranscriptsSection({ buyerId, transcripts, onRefresh }: BuyerTranscriptsSectionProps) {
  const { toast } = useToast();
  const [transcriptDialogOpen, setTranscriptDialogOpen] = useState(false);
  const [newTranscript, setNewTranscript] = useState({ title: "", url: "", notes: "", call_date: "" });
  const [isUploading, setIsUploading] = useState(false);
  const [processingTranscripts, setProcessingTranscripts] = useState<Set<string>>(new Set());
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<string>>(new Set());
  const [isReextractingAll, setIsReextractingAll] = useState(false);

  const addTranscriptLink = async () => {
    if (!newTranscript.title.trim()) return;
    const { error } = await supabase.from("buyer_transcripts").insert({
      buyer_id: buyerId,
      title: newTranscript.title,
      url: newTranscript.url,
      notes: newTranscript.notes,
      call_date: newTranscript.call_date || null,
      transcript_type: "link"
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Transcript link added" });
    setNewTranscript({ title: "", url: "", notes: "", call_date: "" });
    setTranscriptDialogOpen(false);
    onRefresh();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "Upload failed", description: "You must be logged in", variant: "destructive" }); setIsUploading(false); return; }
    
    const fileName = `${user.id}/${buyerId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("call-transcripts").upload(fileName, file);
    
    if (uploadError) { toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" }); setIsUploading(false); return; }

    await supabase.from("buyer_transcripts").insert({
      buyer_id: buyerId, title: file.name, url: fileName, transcript_type: "file", call_date: newTranscript.call_date || null,
    });
    
    toast({ title: "Transcript uploaded" });
    setIsUploading(false);
    setTranscriptDialogOpen(false);
    onRefresh();
  };

  const deleteTranscript = async (transcript: any) => {
    if (transcript.transcript_type === "file") {
      await supabase.storage.from("call-transcripts").remove([transcript.url]);
    }
    await supabase.from("buyer_transcripts").delete().eq("id", transcript.id);
    toast({ title: "Transcript removed" });
    onRefresh();
  };

  const getTranscriptUrl = (transcript: any) => {
    if (transcript.transcript_type === "link") return transcript.url;
    const { data } = supabase.storage.from("call-transcripts").getPublicUrl(transcript.url);
    return data.publicUrl;
  };

  const processTranscriptWithAI = async (transcriptId: string, applyToProfile: boolean = false) => {
    setProcessingTranscripts(prev => new Set(prev).add(transcriptId));
    try {
      const { data, error } = await supabase.functions.invoke('extract-transcript', { body: { transcriptId, applyToProfile } });
      if (error) { toast({ title: "Processing failed", description: error.message, variant: "destructive" }); return; }
      if (data.needsContent) { toast({ title: "Insufficient content", description: "Please add detailed notes to the transcript before processing.", variant: "destructive" }); return; }
      if (data.success) {
        toast({ title: applyToProfile ? "Applied to profile" : "Extraction complete", description: data.message });
        onRefresh();
        setExpandedTranscripts(prev => new Set(prev).add(transcriptId));
      } else {
        toast({ title: "Processing failed", description: data.error, variant: "destructive" });
      }
    } finally {
      setProcessingTranscripts(prev => { const next = new Set(prev); next.delete(transcriptId); return next; });
    }
  };

  const reextractAllTranscripts = async () => {
    const transcriptsWithContent = transcripts.filter(t => t.notes && t.notes.length > 50);
    if (transcriptsWithContent.length === 0) { toast({ title: "No transcripts to process", variant: "destructive" }); return; }
    setIsReextractingAll(true);
    let successCount = 0;
    for (const transcript of transcriptsWithContent) {
      setProcessingTranscripts(prev => new Set(prev).add(transcript.id));
      try {
        const { data, error } = await supabase.functions.invoke('extract-transcript', { body: { transcriptId: transcript.id, applyToProfile: true } });
        if (!error && data?.success) successCount++;
      } catch {}
      setProcessingTranscripts(prev => { const next = new Set(prev); next.delete(transcript.id); return next; });
    }
    setIsReextractingAll(false);
    onRefresh();
    toast({ title: "Re-extraction complete", description: `Processed ${successCount} transcript(s)` });
  };

  const toggleTranscriptExpanded = (transcriptId: string) => {
    setExpandedTranscripts(prev => {
      const next = new Set(prev);
      if (next.has(transcriptId)) next.delete(transcriptId); else next.add(transcriptId);
      return next;
    });
  };

  const getTranscriptStatus = (transcript: any) => {
    if (processingTranscripts.has(transcript.id)) return 'processing';
    if (transcript.processed_at) return 'extracted';
    return 'pending';
  };

  return (
    <BuyerDataSection title="Transcripts & Call Intelligence" icon={<FileText className="w-4 h-4 text-muted-foreground" />} className="lg:col-span-2">
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          {transcripts.length > 0 && (
            <Button size="sm" variant="outline" onClick={reextractAllTranscripts} disabled={isReextractingAll || processingTranscripts.size > 0}>
              {isReextractingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Re-extract All ({transcripts.filter(t => t.notes && t.notes.length > 50).length})
            </Button>
          )}
          <Dialog open={transcriptDialogOpen} onOpenChange={setTranscriptDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Transcript</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Call Transcript</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div><Label>Title *</Label><Input value={newTranscript.title} onChange={(e) => setNewTranscript({ ...newTranscript, title: e.target.value })} placeholder="e.g., Q1 2024 Buyer Call" className="mt-1" /></div>
                <div><Label>Transcript Link *</Label><Input value={newTranscript.url} onChange={(e) => setNewTranscript({ ...newTranscript, url: e.target.value })} placeholder="https://..." className="mt-1" /></div>
                <div><Label>Notes / Transcript Content</Label><Textarea value={newTranscript.notes} onChange={(e) => setNewTranscript({ ...newTranscript, notes: e.target.value })} placeholder="Paste transcript content..." className="mt-1" rows={6} /></div>
                <div><Label className="text-muted-foreground">Call Date (optional)</Label><Input type="date" value={newTranscript.call_date} onChange={(e) => setNewTranscript({ ...newTranscript, call_date: e.target.value })} className="mt-1" /></div>
                <Button onClick={addTranscriptLink} disabled={!newTranscript.title.trim() || !newTranscript.url.trim()} className="w-full"><Link2 className="w-4 h-4 mr-2" />Add Transcript Link</Button>
                <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or upload file</span></div></div>
                <div>
                  <Label htmlFor="transcript-upload" className="cursor-pointer">
                    <div className={`border-2 border-dashed rounded-lg p-4 text-center ${!newTranscript.title.trim() ? 'opacity-50' : 'hover:border-primary/50 cursor-pointer'}`}>
                      {isUploading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : <><Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Click to upload</p></>}
                    </div>
                  </Label>
                  <input id="transcript-upload" type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt,.md" disabled={!newTranscript.title.trim()} />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {transcripts.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No transcripts linked yet.</p>
        ) : (
          <div className="space-y-3">
            {transcripts.map((t) => {
              const status = getTranscriptStatus(t);
              const isExpanded = expandedTranscripts.has(t.id);
              
              return (
                <Collapsible key={t.id} open={isExpanded} onOpenChange={() => toggleTranscriptExpanded(t.id)}>
                  <div className="border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{t.title}</p>
                          {status === 'processing' && <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>}
                          {status === 'extracted' && <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Extracted</Badge>}
                          {status === 'pending' && <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>}
                        </div>
                        {t.call_date && <p className="text-xs text-muted-foreground">{new Date(t.call_date).toLocaleDateString()}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {t.url && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(getTranscriptUrl(t), '_blank')}><Link2 className="w-3.5 h-3.5" /></Button>}
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => processTranscriptWithAI(t.id, true)} disabled={status === 'processing'}>{status === 'processing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}</Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteTranscript(t)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        <CollapsibleTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7">{isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</Button></CollapsibleTrigger>
                      </div>
                    </div>
                    <CollapsibleContent className="pt-3 mt-3 border-t">
                      {t.notes && <div className="mb-3"><p className="text-xs font-medium text-muted-foreground mb-1">Notes</p><p className="text-sm whitespace-pre-wrap">{t.notes}</p></div>}
                      {t.extracted_data && (
                        <div><p className="text-xs font-medium text-muted-foreground mb-1">Extracted Intelligence</p><pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">{JSON.stringify(t.extracted_data, null, 2)}</pre></div>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </BuyerDataSection>
  );
}
