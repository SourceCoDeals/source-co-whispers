import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, X, ChevronDown, ChevronRight } from "lucide-react";

export interface UploadedDoc {
  name: string;
  path: string;
  size: number;
}

interface DocumentUploadSectionProps {
  uploadedDocs: UploadedDoc[];
  onDocsChange: (docs: UploadedDoc[]) => void;
}

export function DocumentUploadSection({ uploadedDocs, onDocsChange }: DocumentUploadSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to upload files", variant: "destructive" });
      setIsUploading(false);
      return;
    }

    const newDocs: UploadedDoc[] = [];
    for (const file of Array.from(files)) {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("tracker-documents").upload(filePath, file);
      
      if (error) {
        toast({ title: "Upload failed", description: `Failed to upload ${file.name}`, variant: "destructive" });
        continue;
      }
      
      newDocs.push({ name: file.name, path: filePath, size: file.size });
    }

    onDocsChange([...uploadedDocs, ...newDocs]);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    if (newDocs.length > 0) {
      toast({ title: "Uploaded", description: `${newDocs.length} file(s) added` });
    }
  };

  const removeDoc = async (doc: UploadedDoc) => {
    await supabase.storage.from("tracker-documents").remove([doc.path]);
    onDocsChange(uploadedDocs.filter(d => d.path !== doc.path));
    toast({ title: "Removed", description: doc.name });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed border-border/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Upload Documents</CardTitle>
                  <CardDescription className="text-sm">
                    Investment memos, thesis docs, or market research
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {uploadedDocs.length > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {uploadedDocs.length} file{uploadedDocs.length > 1 ? 's' : ''}
                  </span>
                )}
                {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.pptx,.ppt"
            />

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full border-dashed"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {isUploading ? "Uploading..." : "Choose Files"}
            </Button>

            {uploadedDocs.length > 0 && (
              <div className="space-y-2">
                {uploadedDocs.map((doc) => (
                  <div key={doc.path} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{doc.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">({formatFileSize(doc.size)})</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDoc(doc)}
                      className="shrink-0 h-6 w-6"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Documents will be analyzed after creation to extract buyer fit criteria.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
