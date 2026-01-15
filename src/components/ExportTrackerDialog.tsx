import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, FileArchive, FileJson, FileSpreadsheet, Users, Briefcase } from "lucide-react";
import {
  fetchTrackerExportData,
  exportTrackerToJSON,
  exportBuyersToCSV,
  exportDealsToCSV,
  exportFullPackage,
  type TrackerExportData,
} from "@/lib/exportTracker";
import { saveAs } from "file-saver";

interface ExportTrackerDialogProps {
  trackerId: string;
  trackerName: string;
}

type ExportFormat = "full" | "json" | "buyers" | "deals";

export function ExportTrackerDialog({ trackerId, trackerName }: ExportTrackerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("full");
  const [previewData, setPreviewData] = useState<TrackerExportData | null>(null);
  const { toast } = useToast();

  const handleOpen = async (open: boolean) => {
    setIsOpen(open);
    if (open && !previewData) {
      setIsLoading(true);
      try {
        const data = await fetchTrackerExportData(trackerId);
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
      const sanitizedName = trackerName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const dateStr = new Date().toISOString().split("T")[0];

      switch (exportFormat) {
        case "full":
          await exportFullPackage(trackerId);
          toast({ title: "Export complete", description: "ZIP package downloaded" });
          break;

        case "json":
          if (previewData) {
            exportTrackerToJSON(previewData);
            toast({ title: "Export complete", description: "JSON file downloaded" });
          }
          break;

        case "buyers":
          if (previewData) {
            const csv = exportBuyersToCSV(previewData.buyers);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
            saveAs(blob, `${sanitizedName}_buyers_${dateStr}.csv`);
            toast({ title: "Export complete", description: "Buyers CSV downloaded" });
          }
          break;

        case "deals":
          if (previewData) {
            const csv = exportDealsToCSV(previewData.deals);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
            saveAs(blob, `${sanitizedName}_deals_${dateStr}.csv`);
            toast({ title: "Export complete", description: "Deals CSV downloaded" });
          }
          break;
      }

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

  const formatOptions = [
    {
      value: "full" as const,
      label: "Complete Package (ZIP)",
      description: "All data + CSVs + instructions - recommended for full backup",
      icon: FileArchive,
      recommended: true,
    },
    {
      value: "json" as const,
      label: "JSON Only",
      description: "Complete nested data structure for programmatic use",
      icon: FileJson,
    },
    {
      value: "buyers" as const,
      label: "Buyers CSV Only",
      description: "Compatible with Import CSV on Buyers tab",
      icon: Users,
    },
    {
      value: "deals" as const,
      label: "Deals CSV Only",
      description: "Compatible with Import Deals on Deals tab",
      icon: Briefcase,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Tracker Data</DialogTitle>
          <DialogDescription>
            Download all data from "{trackerName}" for backup or migration
          </DialogDescription>
        </DialogHeader>

        {isLoading && !previewData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading data...</span>
          </div>
        ) : previewData ? (
          <div className="space-y-6">
            {/* Data Preview */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-3">Data Summary</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{previewData.stats.buyerCount} buyers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <span>{previewData.stats.dealCount} deals</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                  <span>{previewData.stats.contactCount} contacts</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                  <span>{previewData.stats.scoreCount} scores</span>
                </div>
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <h4 className="text-sm font-medium mb-3">Export Format</h4>
              <RadioGroup
                value={exportFormat}
                onValueChange={(v) => setExportFormat(v as ExportFormat)}
                className="space-y-3"
              >
                {formatOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      exportFormat === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setExportFormat(option.value)}
                  >
                    <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                    <div className="flex-1">
                      <Label
                        htmlFor={option.value}
                        className="flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <option.icon className="w-4 h-4" />
                        {option.label}
                        {option.recommended && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Export Button */}
            <Button onClick={handleExport} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Export
                </>
              )}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
