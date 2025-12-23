import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Helper functions
const parseCsv = (value: string | string[] | null | undefined): string[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'string') return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
};

const toArrayOrNull = (value: string | string[] | null | undefined): string[] | null => {
  const arr = parseCsv(value);
  return arr.length > 0 ? arr : null;
};

const toNumberOrNull = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
};

const arrayToString = (arr: string[] | null | undefined): string => {
  if (!arr || !Array.isArray(arr)) return '';
  return arr.join(', ');
};

type SectionType = 
  | 'company_info'
  | 'hq_address'
  | 'business_description'
  | 'investment_criteria'
  | 'geographic_footprint'
  | 'deal_structure'
  | 'customer_info'
  | 'acquisition_history';

interface BuyerSectionEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: SectionType;
  buyer: any;
  onSave: () => void;
}

export function BuyerSectionEditDialog({ 
  open, 
  onOpenChange, 
  section, 
  buyer, 
  onSave 
}: BuyerSectionEditDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>(() => initFormData(section, buyer));

  // Reset form when dialog opens with new buyer data
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormData(initFormData(section, buyer));
    }
    onOpenChange(newOpen);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData = buildUpdateData(section, formData);
      const { error } = await supabase
        .from("buyers")
        .update(updateData)
        .eq("id", buyer.id);

      if (error) throw error;

      toast({ title: "Section updated successfully" });
      onSave();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getSectionTitle(section)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {renderSectionForm(section, formData, updateField)}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getSectionTitle(section: SectionType): string {
  const titles: Record<SectionType, string> = {
    company_info: 'Edit Company & Firm Info',
    hq_address: 'Edit Headquarter Address',
    business_description: 'Edit Business Description',
    investment_criteria: 'Edit Investment Criteria',
    geographic_footprint: 'Edit Geographic Footprint',
    deal_structure: 'Edit Deal Structure',
    customer_info: 'Edit Customer / End Market Info',
    acquisition_history: 'Edit Acquisition History',
  };
  return titles[section];
}

function initFormData(section: SectionType, buyer: any): Record<string, any> {
  switch (section) {
    case 'company_info':
      return {
        platform_company_name: buyer?.platform_company_name || '',
        platform_website: buyer?.platform_website || '',
        buyer_linkedin: buyer?.buyer_linkedin || '',
        pe_firm_name: buyer?.pe_firm_name || '',
        pe_firm_website: buyer?.pe_firm_website || '',
        pe_firm_linkedin: buyer?.pe_firm_linkedin || '',
        fee_agreement_status: buyer?.fee_agreement_status || '',
      };
    case 'hq_address':
      return {
        hq_city: buyer?.hq_city || '',
        hq_state: buyer?.hq_state || '',
        hq_country: buyer?.hq_country || '',
        hq_region: buyer?.hq_region || '',
        other_office_locations: arrayToString(buyer?.other_office_locations),
        service_regions: arrayToString(buyer?.service_regions),
      };
    case 'business_description':
      return {
        services_offered: buyer?.services_offered || '',
        industry_vertical: buyer?.industry_vertical || '',
        business_summary: buyer?.business_summary || '',
        specialized_focus: buyer?.specialized_focus || '',
        business_type: buyer?.business_type || buyer?.business_model || '',
      };
    case 'investment_criteria':
      return {
        thesis_summary: buyer?.thesis_summary || '',
        thesis_confidence: buyer?.thesis_confidence || '',
        strategic_priorities: buyer?.strategic_priorities || '',
        service_mix_prefs: buyer?.service_mix_prefs || '',
        target_services: arrayToString(buyer?.target_services),
        required_capabilities: arrayToString(buyer?.required_capabilities),
        target_industries: arrayToString(buyer?.target_industries),
        industry_exclusions: arrayToString(buyer?.industry_exclusions),
        deal_breakers: arrayToString(buyer?.deal_breakers),
      };
    case 'geographic_footprint':
      return {
        geographic_footprint: arrayToString(buyer?.geographic_footprint),
        service_regions: arrayToString(buyer?.service_regions),
        target_geographies: arrayToString(buyer?.target_geographies),
        geographic_exclusions: arrayToString(buyer?.geographic_exclusions),
      };
    case 'deal_structure':
      return {
        min_revenue: buyer?.min_revenue ?? '',
        max_revenue: buyer?.max_revenue ?? '',
        revenue_sweet_spot: buyer?.revenue_sweet_spot ?? '',
        min_ebitda: buyer?.min_ebitda ?? '',
        max_ebitda: buyer?.max_ebitda ?? '',
        ebitda_sweet_spot: buyer?.ebitda_sweet_spot ?? '',
        preferred_ebitda: buyer?.preferred_ebitda ?? '',
        business_model_prefs: buyer?.business_model_prefs || '',
        business_model_exclusions: arrayToString(buyer?.business_model_exclusions),
        addon_only: buyer?.addon_only || false,
        platform_only: buyer?.platform_only || false,
        owner_roll_requirement: buyer?.owner_roll_requirement || '',
        owner_transition_goals: buyer?.owner_transition_goals || '',
        acquisition_appetite: buyer?.acquisition_appetite || '',
        acquisition_timeline: buyer?.acquisition_timeline || '',
      };
    case 'customer_info':
      return {
        primary_customer_size: buyer?.primary_customer_size || '',
        customer_geographic_reach: buyer?.customer_geographic_reach || '',
        customer_industries: arrayToString(buyer?.customer_industries),
        target_customer_profile: buyer?.target_customer_profile || '',
        target_customer_size: buyer?.target_customer_size || '',
        target_customer_geography: buyer?.target_customer_geography || '',
        target_customer_industries: arrayToString(buyer?.target_customer_industries),
      };
    case 'acquisition_history':
      return {
        last_acquisition_date: buyer?.last_acquisition_date || '',
        total_acquisitions: buyer?.total_acquisitions ?? '',
        acquisition_frequency: buyer?.acquisition_frequency || '',
        portfolio_companies: arrayToString(buyer?.portfolio_companies),
      };
    default:
      return {};
  }
}

function buildUpdateData(section: SectionType, formData: Record<string, any>): Record<string, any> {
  switch (section) {
    case 'company_info':
      return {
        platform_company_name: formData.platform_company_name || null,
        platform_website: formData.platform_website || null,
        buyer_linkedin: formData.buyer_linkedin || null,
        pe_firm_name: formData.pe_firm_name || null,
        pe_firm_website: formData.pe_firm_website || null,
        pe_firm_linkedin: formData.pe_firm_linkedin || null,
        fee_agreement_status: formData.fee_agreement_status || null,
      };
    case 'hq_address':
      return {
        hq_city: formData.hq_city || null,
        hq_state: formData.hq_state || null,
        hq_country: formData.hq_country || null,
        hq_region: formData.hq_region || null,
        other_office_locations: toArrayOrNull(formData.other_office_locations),
        service_regions: toArrayOrNull(formData.service_regions),
      };
    case 'business_description':
      return {
        services_offered: formData.services_offered || null,
        industry_vertical: formData.industry_vertical || null,
        business_summary: formData.business_summary || null,
        specialized_focus: formData.specialized_focus || null,
        business_type: formData.business_type || null,
      };
    case 'investment_criteria':
      return {
        thesis_summary: formData.thesis_summary || null,
        thesis_confidence: formData.thesis_confidence || null,
        strategic_priorities: formData.strategic_priorities || null,
        service_mix_prefs: formData.service_mix_prefs || null,
        target_services: toArrayOrNull(formData.target_services),
        required_capabilities: toArrayOrNull(formData.required_capabilities),
        target_industries: toArrayOrNull(formData.target_industries),
        industry_exclusions: toArrayOrNull(formData.industry_exclusions),
        deal_breakers: toArrayOrNull(formData.deal_breakers),
      };
    case 'geographic_footprint':
      return {
        geographic_footprint: toArrayOrNull(formData.geographic_footprint),
        service_regions: toArrayOrNull(formData.service_regions),
        target_geographies: toArrayOrNull(formData.target_geographies),
        geographic_exclusions: toArrayOrNull(formData.geographic_exclusions),
      };
    case 'deal_structure':
      return {
        min_revenue: toNumberOrNull(formData.min_revenue),
        max_revenue: toNumberOrNull(formData.max_revenue),
        revenue_sweet_spot: toNumberOrNull(formData.revenue_sweet_spot),
        min_ebitda: toNumberOrNull(formData.min_ebitda),
        max_ebitda: toNumberOrNull(formData.max_ebitda),
        ebitda_sweet_spot: toNumberOrNull(formData.ebitda_sweet_spot),
        preferred_ebitda: toNumberOrNull(formData.preferred_ebitda),
        business_model_prefs: formData.business_model_prefs || null,
        business_model_exclusions: toArrayOrNull(formData.business_model_exclusions),
        addon_only: formData.addon_only || false,
        platform_only: formData.platform_only || false,
        owner_roll_requirement: formData.owner_roll_requirement || null,
        owner_transition_goals: formData.owner_transition_goals || null,
        acquisition_appetite: formData.acquisition_appetite || null,
        acquisition_timeline: formData.acquisition_timeline || null,
      };
    case 'customer_info':
      return {
        primary_customer_size: formData.primary_customer_size || null,
        customer_geographic_reach: formData.customer_geographic_reach || null,
        customer_industries: toArrayOrNull(formData.customer_industries),
        target_customer_profile: formData.target_customer_profile || null,
        target_customer_size: formData.target_customer_size || null,
        target_customer_geography: formData.target_customer_geography || null,
        target_customer_industries: toArrayOrNull(formData.target_customer_industries),
      };
    case 'acquisition_history':
      return {
        last_acquisition_date: formData.last_acquisition_date || null,
        total_acquisitions: toNumberOrNull(formData.total_acquisitions),
        acquisition_frequency: formData.acquisition_frequency || null,
        portfolio_companies: toArrayOrNull(formData.portfolio_companies),
      };
    default:
      return {};
  }
}

function renderSectionForm(
  section: SectionType, 
  formData: Record<string, any>, 
  updateField: (field: string, value: any) => void
) {
  switch (section) {
    case 'company_info':
      return (
        <div className="space-y-4">
          <div>
            <Label>Platform Company Name</Label>
            <Input value={formData.platform_company_name} onChange={e => updateField('platform_company_name', e.target.value)} />
          </div>
          <div>
            <Label>Platform Website</Label>
            <Input value={formData.platform_website} onChange={e => updateField('platform_website', e.target.value)} />
          </div>
          <div>
            <Label>Buyer LinkedIn</Label>
            <Input value={formData.buyer_linkedin} onChange={e => updateField('buyer_linkedin', e.target.value)} />
          </div>
          <div>
            <Label>PE Firm Name</Label>
            <Input value={formData.pe_firm_name} onChange={e => updateField('pe_firm_name', e.target.value)} />
          </div>
          <div>
            <Label>PE Firm Website</Label>
            <Input value={formData.pe_firm_website} onChange={e => updateField('pe_firm_website', e.target.value)} />
          </div>
          <div>
            <Label>PE Firm LinkedIn</Label>
            <Input value={formData.pe_firm_linkedin} onChange={e => updateField('pe_firm_linkedin', e.target.value)} />
          </div>
          <div>
            <Label>Fee Agreement Status</Label>
            <Input value={formData.fee_agreement_status} onChange={e => updateField('fee_agreement_status', e.target.value)} placeholder="e.g., Signed, Pending, None" />
          </div>
        </div>
      );

    case 'hq_address':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>City</Label>
              <Input value={formData.hq_city} onChange={e => updateField('hq_city', e.target.value)} />
            </div>
            <div>
              <Label>State</Label>
              <Input value={formData.hq_state} onChange={e => updateField('hq_state', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Country</Label>
              <Input value={formData.hq_country} onChange={e => updateField('hq_country', e.target.value)} />
            </div>
            <div>
              <Label>Region</Label>
              <Input value={formData.hq_region} onChange={e => updateField('hq_region', e.target.value)} placeholder="e.g., Northeast, Midwest" />
            </div>
          </div>
          <div>
            <Label>Other Office Locations</Label>
            <Input value={formData.other_office_locations} onChange={e => updateField('other_office_locations', e.target.value)} placeholder="Comma-separated (e.g., Chicago, Denver, Miami)" />
          </div>
          <div>
            <Label>Service Regions</Label>
            <Input value={formData.service_regions} onChange={e => updateField('service_regions', e.target.value)} placeholder="Comma-separated (e.g., Northeast, Southeast)" />
          </div>
        </div>
      );

    case 'business_description':
      return (
        <div className="space-y-4">
          <div>
            <Label>Primary Services / Products</Label>
            <Input value={formData.services_offered} onChange={e => updateField('services_offered', e.target.value)} />
          </div>
          <div>
            <Label>Industry Vertical</Label>
            <Input value={formData.industry_vertical} onChange={e => updateField('industry_vertical', e.target.value)} />
          </div>
          <div>
            <Label>Business Summary</Label>
            <Textarea value={formData.business_summary} onChange={e => updateField('business_summary', e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Specialized Focus</Label>
            <Textarea value={formData.specialized_focus} onChange={e => updateField('specialized_focus', e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Business Type</Label>
            <Input value={formData.business_type} onChange={e => updateField('business_type', e.target.value)} />
          </div>
        </div>
      );

    case 'investment_criteria':
      return (
        <div className="space-y-4">
          <div>
            <Label>Investment Thesis</Label>
            <Textarea value={formData.thesis_summary} onChange={e => updateField('thesis_summary', e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Thesis Confidence</Label>
            <Input value={formData.thesis_confidence} onChange={e => updateField('thesis_confidence', e.target.value)} placeholder="e.g., high, medium, low" />
          </div>
          <div>
            <Label>Strategic Priorities</Label>
            <Textarea value={formData.strategic_priorities} onChange={e => updateField('strategic_priorities', e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Service Mix Preferences</Label>
            <Input value={formData.service_mix_prefs} onChange={e => updateField('service_mix_prefs', e.target.value)} />
          </div>
          <div>
            <Label>Target Services</Label>
            <Input value={formData.target_services} onChange={e => updateField('target_services', e.target.value)} placeholder="Comma-separated" />
          </div>
          <div>
            <Label>Required Capabilities</Label>
            <Input value={formData.required_capabilities} onChange={e => updateField('required_capabilities', e.target.value)} placeholder="Comma-separated" />
          </div>
          <div>
            <Label>Target Industries</Label>
            <Input value={formData.target_industries} onChange={e => updateField('target_industries', e.target.value)} placeholder="Comma-separated" />
          </div>
          <div>
            <Label>Industry Exclusions</Label>
            <Input value={formData.industry_exclusions} onChange={e => updateField('industry_exclusions', e.target.value)} placeholder="Comma-separated" />
          </div>
          <div>
            <Label>Deal Breakers</Label>
            <Input value={formData.deal_breakers} onChange={e => updateField('deal_breakers', e.target.value)} placeholder="Comma-separated" />
          </div>
        </div>
      );

    case 'geographic_footprint':
      return (
        <div className="space-y-4">
          <div>
            <Label>Current Locations</Label>
            <Input value={formData.geographic_footprint} onChange={e => updateField('geographic_footprint', e.target.value)} placeholder="Comma-separated (e.g., MA, NH, CT)" />
          </div>
          <div>
            <Label>Service Regions</Label>
            <Input value={formData.service_regions} onChange={e => updateField('service_regions', e.target.value)} placeholder="Comma-separated (e.g., New England, Mid-Atlantic)" />
          </div>
          <div>
            <Label>Target Geographies</Label>
            <Input value={formData.target_geographies} onChange={e => updateField('target_geographies', e.target.value)} placeholder="Comma-separated" />
          </div>
          <div>
            <Label>Geographic Exclusions</Label>
            <Input value={formData.geographic_exclusions} onChange={e => updateField('geographic_exclusions', e.target.value)} placeholder="Comma-separated" />
          </div>
        </div>
      );

    case 'deal_structure':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Min Revenue ($M)</Label>
              <Input type="number" value={formData.min_revenue} onChange={e => updateField('min_revenue', e.target.value)} />
            </div>
            <div>
              <Label>Max Revenue ($M)</Label>
              <Input type="number" value={formData.max_revenue} onChange={e => updateField('max_revenue', e.target.value)} />
            </div>
            <div>
              <Label>Sweet Spot ($M)</Label>
              <Input type="number" value={formData.revenue_sweet_spot} onChange={e => updateField('revenue_sweet_spot', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Min EBITDA ($M)</Label>
              <Input type="number" value={formData.min_ebitda} onChange={e => updateField('min_ebitda', e.target.value)} />
            </div>
            <div>
              <Label>Max EBITDA ($M)</Label>
              <Input type="number" value={formData.max_ebitda} onChange={e => updateField('max_ebitda', e.target.value)} />
            </div>
            <div>
              <Label>EBITDA Sweet Spot ($M)</Label>
              <Input type="number" value={formData.ebitda_sweet_spot} onChange={e => updateField('ebitda_sweet_spot', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Preferred EBITDA ($M)</Label>
            <Input type="number" value={formData.preferred_ebitda} onChange={e => updateField('preferred_ebitda', e.target.value)} />
          </div>
          <div>
            <Label>Business Model Preferences</Label>
            <Input value={formData.business_model_prefs} onChange={e => updateField('business_model_prefs', e.target.value)} />
          </div>
          <div>
            <Label>Business Model Exclusions</Label>
            <Input value={formData.business_model_exclusions} onChange={e => updateField('business_model_exclusions', e.target.value)} placeholder="Comma-separated" />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={formData.addon_only} onCheckedChange={v => updateField('addon_only', v)} />
              <Label>Add-on Only</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.platform_only} onCheckedChange={v => updateField('platform_only', v)} />
              <Label>Platform Only</Label>
            </div>
          </div>
          <div>
            <Label>Owner Roll Requirement</Label>
            <Input value={formData.owner_roll_requirement} onChange={e => updateField('owner_roll_requirement', e.target.value)} />
          </div>
          <div>
            <Label>Owner Transition Goals</Label>
            <Input value={formData.owner_transition_goals} onChange={e => updateField('owner_transition_goals', e.target.value)} />
          </div>
          <div>
            <Label>Acquisition Appetite</Label>
            <Input value={formData.acquisition_appetite} onChange={e => updateField('acquisition_appetite', e.target.value)} />
          </div>
          <div>
            <Label>Acquisition Timeline</Label>
            <Input value={formData.acquisition_timeline} onChange={e => updateField('acquisition_timeline', e.target.value)} />
          </div>
        </div>
      );

    case 'customer_info':
      return (
        <div className="space-y-4">
          <div>
            <Label>Primary Customer Size</Label>
            <Input value={formData.primary_customer_size} onChange={e => updateField('primary_customer_size', e.target.value)} placeholder="e.g., SMB, Mid-Market, Enterprise" />
          </div>
          <div>
            <Label>Customer Geographic Reach</Label>
            <Input value={formData.customer_geographic_reach} onChange={e => updateField('customer_geographic_reach', e.target.value)} />
          </div>
          <div>
            <Label>Customer Industries</Label>
            <Input value={formData.customer_industries} onChange={e => updateField('customer_industries', e.target.value)} placeholder="Comma-separated" />
          </div>
          <div>
            <Label>Target Customer Profile</Label>
            <Textarea value={formData.target_customer_profile} onChange={e => updateField('target_customer_profile', e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Target Customer Size</Label>
            <Input value={formData.target_customer_size} onChange={e => updateField('target_customer_size', e.target.value)} />
          </div>
          <div>
            <Label>Target Customer Geography</Label>
            <Input value={formData.target_customer_geography} onChange={e => updateField('target_customer_geography', e.target.value)} />
          </div>
          <div>
            <Label>Target Customer Industries</Label>
            <Input value={formData.target_customer_industries} onChange={e => updateField('target_customer_industries', e.target.value)} placeholder="Comma-separated" />
          </div>
        </div>
      );

    case 'acquisition_history':
      return (
        <div className="space-y-4">
          <div>
            <Label>Last Acquisition Date</Label>
            <Input type="date" value={formData.last_acquisition_date} onChange={e => updateField('last_acquisition_date', e.target.value)} />
          </div>
          <div>
            <Label>Total Acquisitions</Label>
            <Input type="number" value={formData.total_acquisitions} onChange={e => updateField('total_acquisitions', e.target.value)} />
          </div>
          <div>
            <Label>Acquisition Frequency</Label>
            <Input value={formData.acquisition_frequency} onChange={e => updateField('acquisition_frequency', e.target.value)} placeholder="e.g., 2-3 per year" />
          </div>
          <div>
            <Label>Portfolio Companies</Label>
            <Textarea value={formData.portfolio_companies} onChange={e => updateField('portfolio_companies', e.target.value)} placeholder="Comma-separated list of portfolio companies" rows={3} />
          </div>
        </div>
      );

    default:
      return null;
  }
}
