import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IntelligenceBadge } from "@/components/IntelligenceBadge";
import { ArrowLeft, Edit, ExternalLink, Building2, MapPin, FileCheck, Sparkles, Loader2 } from "lucide-react";

interface CoreEditData {
  platform_company_name: string;
  platform_website: string;
  buyer_linkedin: string;
  pe_firm_name: string;
  pe_firm_website: string;
  pe_firm_linkedin: string;
  hq_city: string;
  hq_state: string;
  hq_country: string;
}

interface BuyerHeaderProps {
  buyer: any;
  onNavigateBack: () => void;
  editDialogOpen: boolean;
  onEditDialogOpenChange: (open: boolean) => void;
  coreEditData: CoreEditData;
  onCoreEditDataChange: (data: CoreEditData) => void;
  onSaveCoreInfo: () => void;
  onEnrichFromWebsite: () => void;
  isEnriching: boolean;
}

export function BuyerHeader({
  buyer,
  onNavigateBack,
  editDialogOpen,
  onEditDialogOpenChange,
  coreEditData,
  onCoreEditDataChange,
  onSaveCoreInfo,
  onEnrichFromWebsite,
  isEnriching,
}: BuyerHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      <Button variant="ghost" size="icon" onClick={onNavigateBack} className="mt-1">
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <div className="flex-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-display font-bold">
            {buyer.platform_company_name || buyer.pe_firm_name}
          </h1>
          <IntelligenceBadge buyer={buyer} showPercentage />
          {buyer.fee_agreement_status && buyer.fee_agreement_status !== 'None' && (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              <FileCheck className="w-3 h-3 mr-1" />
              {buyer.fee_agreement_status}
            </Badge>
          )}
        </div>
        {buyer.platform_company_name && (
          <div className="flex items-center gap-2 text-lg text-muted-foreground">
            <Building2 className="w-4 h-4" />
            {buyer.pe_firm_name}
          </div>
        )}
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
          {buyer.platform_website && (
            <a href={buyer.platform_website.startsWith("http") ? buyer.platform_website : `https://${buyer.platform_website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
              <ExternalLink className="w-3.5 h-3.5" />Platform Website
            </a>
          )}
          {(buyer.hq_city || buyer.hq_state) && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />HQ: {[buyer.hq_city, buyer.hq_state, buyer.hq_country].filter(Boolean).join(", ")}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Dialog open={editDialogOpen} onOpenChange={onEditDialogOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Buyer Info</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Platform Company Section */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Platform Company</h4>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="platform_company_name">Company Name</Label>
                    <Input
                      id="platform_company_name"
                      value={coreEditData.platform_company_name}
                      onChange={(e) => onCoreEditDataChange({ ...coreEditData, platform_company_name: e.target.value })}
                      placeholder="e.g., Minuteman Collision"
                    />
                  </div>
                  <div>
                    <Label htmlFor="platform_website">Website</Label>
                    <Input
                      id="platform_website"
                      value={coreEditData.platform_website}
                      onChange={(e) => onCoreEditDataChange({ ...coreEditData, platform_website: e.target.value })}
                      placeholder="https://www.company.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="buyer_linkedin">LinkedIn</Label>
                    <Input
                      id="buyer_linkedin"
                      value={coreEditData.buyer_linkedin}
                      onChange={(e) => onCoreEditDataChange({ ...coreEditData, buyer_linkedin: e.target.value })}
                      placeholder="https://linkedin.com/company/..."
                    />
                  </div>
                </div>
              </div>

              {/* PE Firm Section */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">PE / Parent Firm</h4>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="pe_firm_name">Firm Name</Label>
                    <Input
                      id="pe_firm_name"
                      value={coreEditData.pe_firm_name}
                      onChange={(e) => onCoreEditDataChange({ ...coreEditData, pe_firm_name: e.target.value })}
                      placeholder="e.g., Willow River"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pe_firm_website">Website</Label>
                    <Input
                      id="pe_firm_website"
                      value={coreEditData.pe_firm_website}
                      onChange={(e) => onCoreEditDataChange({ ...coreEditData, pe_firm_website: e.target.value })}
                      placeholder="https://www.pefirm.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pe_firm_linkedin">LinkedIn</Label>
                    <Input
                      id="pe_firm_linkedin"
                      value={coreEditData.pe_firm_linkedin}
                      onChange={(e) => onCoreEditDataChange({ ...coreEditData, pe_firm_linkedin: e.target.value })}
                      placeholder="https://linkedin.com/company/..."
                    />
                  </div>
                </div>
              </div>

              {/* Location Section */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">HQ Location</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="hq_city">City</Label>
                    <Input
                      id="hq_city"
                      value={coreEditData.hq_city}
                      onChange={(e) => onCoreEditDataChange({ ...coreEditData, hq_city: e.target.value })}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hq_state">State</Label>
                    <Input
                      id="hq_state"
                      value={coreEditData.hq_state}
                      onChange={(e) => onCoreEditDataChange({ ...coreEditData, hq_state: e.target.value })}
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hq_country">Country</Label>
                    <Input
                      id="hq_country"
                      value={coreEditData.hq_country}
                      onChange={(e) => onCoreEditDataChange({ ...coreEditData, hq_country: e.target.value })}
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => onEditDialogOpenChange(false)}>Cancel</Button>
                <Button onClick={onSaveCoreInfo}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Button
          variant="outline"
          onClick={onEnrichFromWebsite}
          disabled={isEnriching || (!buyer.platform_website && !buyer.pe_firm_website)}
        >
          {isEnriching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Enrich
        </Button>
      </div>
    </div>
  );
}
