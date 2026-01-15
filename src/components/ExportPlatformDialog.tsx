import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, Database, FileArchive, AlertTriangle } from "lucide-react";
import { fetchPlatformExportData, exportPlatformToZIP, type PlatformExportData } from "@/lib/exportPlatform";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ExportPlatformDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PlatformExportData | null>(null);
  const { toast } = useToast();

  const handleOpen = async (open: boolean) => {
    setIsOpen(open);
    if (open && !previewData) {
      setIsLoading(true);
      try {
        const data = await fetchPlatformExportData();
        setPreviewData(data);
      } catch (error) {
        toast({
          title: "Failed to load data",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      await exportPlatformToZIP();
      toast({ 
        title: "Export complete", 
        description: "Full platform backup downloaded" 
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Database className="w-4 h-4 mr-2" />
          Export All Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="w-5 h-5" />
            Export Complete Platform
          </DialogTitle>
          <DialogDescription>
            Download all trackers, buyers, deals, and related data for backup or migration
          </DialogDescription>
        </DialogHeader>

        {isLoading && !previewData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading platform data...</span>
          </div>
        ) : previewData ? (
          <div className="space-y-6">
            {/* Data Summary */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-3">Platform Summary</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trackers:</span>
                  <span className="font-medium">{previewData.stats.trackerCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Buyers:</span>
                  <span className="font-medium">{previewData.stats.totalBuyers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deals:</span>
                  <span className="font-medium">{previewData.stats.totalDeals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contacts:</span>
                  <span className="font-medium">{previewData.stats.totalContacts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PE Firms:</span>
                  <span className="font-medium">{previewData.stats.peFirmCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platforms:</span>
                  <span className="font-medium">{previewData.stats.platformCount}</span>
                </div>
              </div>
            </div>

            {/* What's Included */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Export Includes:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <code className="text-xs bg-muted px-1 rounded">schema.sql</code> - Complete database DDL
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <code className="text-xs bg-muted px-1 rounded">IMPORT_INSTRUCTIONS.md</code> - Detailed import guide
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <code className="text-xs bg-muted px-1 rounded">full_backup.json</code> - Complete data export
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Per-tracker folders with CSVs for buyers, deals, contacts
                </li>
              </ul>
            </div>

            {/* Warning */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This export may take a moment for large datasets. Scores are reference-only 
                and will be regenerated on import.
              </AlertDescription>
            </Alert>

            {/* Export Button */}
            <Button onClick={handleExport} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting Platform...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Full Platform Export
                </>
              )}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
