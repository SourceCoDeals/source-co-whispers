import { Badge } from "@/components/ui/badge";
import { DollarSign, MapPin, Briefcase, Users, Building2, Target, TrendingUp } from "lucide-react";

interface SizeCriteria {
  min_revenue?: string;
  max_revenue?: string;
  min_ebitda?: string;
  max_ebitda?: string;
  employee_count?: string;
  location_count?: string;
  sqft_requirements?: string;
  other?: string[];
}

interface ServiceCriteria {
  required_services?: string[];
  preferred_services?: string[];
  excluded_services?: string[];
  business_model?: string;
  customer_profile?: string;
  other?: string[];
}

interface GeographyCriteria {
  required_regions?: string[];
  preferred_regions?: string[];
  excluded_regions?: string[];
  coverage_type?: string;
  hq_requirements?: string;
  other?: string[];
}

interface BuyerType {
  type_name?: string;
  description?: string;
  ownership_profile?: string;
  min_locations?: string;
  min_revenue_per_location?: string;
  min_ebitda?: string;
  min_sqft_per_location?: string;
  geographic_scope?: string;
  acquisition_style?: string;
  typical_deal_size?: string;
  priority_order?: number;
}

interface BuyerTypesCriteria {
  buyer_types?: BuyerType[];
}

interface StructuredCriteriaPanelProps {
  sizeCriteria?: SizeCriteria | null;
  serviceCriteria?: ServiceCriteria | null;
  geographyCriteria?: GeographyCriteria | null;
  buyerTypesCriteria?: BuyerTypesCriteria | null;
}

function CriteriaCard({ 
  title, 
  icon: Icon, 
  children,
  isEmpty 
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  isEmpty?: boolean;
}) {
  return (
    <div className="bg-muted/30 rounded-lg p-4 border">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h4 className="font-medium text-sm">{title}</h4>
      </div>
      {isEmpty ? (
        <p className="text-xs text-muted-foreground italic">No criteria extracted</p>
      ) : (
        <div className="space-y-2 text-sm">{children}</div>
      )}
    </div>
  );
}

function CriteriaRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function CriteriaBadges({ 
  label, 
  items, 
  variant = "outline" 
}: { 
  label: string; 
  items?: string[] | null; 
  variant?: "outline" | "default" | "secondary" | "destructive";
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <span className="text-muted-foreground text-xs block mb-1">{label}</span>
      <div className="flex flex-wrap gap-1">
        {items.map((item, i) => (
          <Badge key={i} variant={variant} className="text-xs">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function BuyerTypeCard({ buyerType, index }: { buyerType: BuyerType; index: number }) {
  const getTypeIcon = (typeName?: string) => {
    const name = typeName?.toLowerCase() || '';
    if (name.includes('large') || name.includes('national')) return Building2;
    if (name.includes('regional')) return Target;
    if (name.includes('pe') || name.includes('platform')) return TrendingUp;
    return Users;
  };
  
  const Icon = getTypeIcon(buyerType.type_name);
  
  return (
    <div className="bg-muted/30 rounded-lg p-4 border">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h4 className="font-medium text-sm">{buyerType.type_name || `Buyer Type ${index + 1}`}</h4>
        {buyerType.priority_order && (
          <Badge variant="outline" className="text-xs ml-auto">
            Priority {buyerType.priority_order}
          </Badge>
        )}
      </div>
      <div className="space-y-2 text-sm">
        {buyerType.description && (
          <p className="text-muted-foreground text-xs mb-2">{buyerType.description}</p>
        )}
        <CriteriaRow label="Ownership" value={buyerType.ownership_profile} />
        <CriteriaRow label="Min Locations" value={buyerType.min_locations} />
        <CriteriaRow label="Rev/Location" value={buyerType.min_revenue_per_location} />
        <CriteriaRow label="Min EBITDA" value={buyerType.min_ebitda} />
        <CriteriaRow label="Min Sq Ft" value={buyerType.min_sqft_per_location} />
        <CriteriaRow label="Geography" value={buyerType.geographic_scope} />
        <CriteriaRow label="Acq. Style" value={buyerType.acquisition_style} />
        <CriteriaRow label="Typical Deal" value={buyerType.typical_deal_size} />
      </div>
    </div>
  );
}

function isSizeEmpty(criteria?: SizeCriteria | null): boolean {
  if (!criteria) return true;
  return !criteria.min_revenue && !criteria.max_revenue && !criteria.min_ebitda && 
         !criteria.max_ebitda && !criteria.employee_count && !criteria.location_count && 
         !criteria.sqft_requirements && (!criteria.other || criteria.other.length === 0);
}

function isServiceEmpty(criteria?: ServiceCriteria | null): boolean {
  if (!criteria) return true;
  return (!criteria.required_services || criteria.required_services.length === 0) &&
         (!criteria.preferred_services || criteria.preferred_services.length === 0) &&
         (!criteria.excluded_services || criteria.excluded_services.length === 0) &&
         !criteria.business_model && !criteria.customer_profile &&
         (!criteria.other || criteria.other.length === 0);
}

function isGeographyEmpty(criteria?: GeographyCriteria | null): boolean {
  if (!criteria) return true;
  return (!criteria.required_regions || criteria.required_regions.length === 0) &&
         (!criteria.preferred_regions || criteria.preferred_regions.length === 0) &&
         (!criteria.excluded_regions || criteria.excluded_regions.length === 0) &&
         !criteria.coverage_type && !criteria.hq_requirements &&
         (!criteria.other || criteria.other.length === 0);
}

function isBuyerTypesEmpty(criteria?: BuyerTypesCriteria | null): boolean {
  if (!criteria) return true;
  return !criteria.buyer_types || criteria.buyer_types.length === 0;
}

export function StructuredCriteriaPanel({ 
  sizeCriteria, 
  serviceCriteria, 
  geographyCriteria,
  buyerTypesCriteria 
}: StructuredCriteriaPanelProps) {
  const allEmpty = isSizeEmpty(sizeCriteria) && isServiceEmpty(serviceCriteria) && 
                   isGeographyEmpty(geographyCriteria) && isBuyerTypesEmpty(buyerTypesCriteria);

  if (allEmpty) {
    return null;
  }

  const hasBuyerTypes = !isBuyerTypesEmpty(buyerTypesCriteria);
  const hasOtherCriteria = !isSizeEmpty(sizeCriteria) || !isServiceEmpty(serviceCriteria) || !isGeographyEmpty(geographyCriteria);

  return (
    <div className="space-y-4 mt-4">
      {/* Buyer Types Section */}
      {hasBuyerTypes && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm">Buyer Types</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buyerTypesCriteria?.buyer_types?.map((bt, i) => (
              <BuyerTypeCard key={i} buyerType={bt} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Other Criteria */}
      {hasOtherCriteria && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CriteriaCard title="Size Criteria" icon={DollarSign} isEmpty={isSizeEmpty(sizeCriteria)}>
            <CriteriaRow label="Min Revenue" value={sizeCriteria?.min_revenue} />
            <CriteriaRow label="Max Revenue" value={sizeCriteria?.max_revenue} />
            <CriteriaRow label="Min EBITDA" value={sizeCriteria?.min_ebitda} />
            <CriteriaRow label="Max EBITDA" value={sizeCriteria?.max_ebitda} />
            <CriteriaRow label="Employees" value={sizeCriteria?.employee_count} />
            <CriteriaRow label="Locations" value={sizeCriteria?.location_count} />
            <CriteriaRow label="Sq Ft" value={sizeCriteria?.sqft_requirements} />
            <CriteriaBadges label="Other" items={sizeCriteria?.other} />
          </CriteriaCard>

          <CriteriaCard title="Service/Product Mix" icon={Briefcase} isEmpty={isServiceEmpty(serviceCriteria)}>
            <CriteriaBadges label="Required" items={serviceCriteria?.required_services} variant="default" />
            <CriteriaBadges label="Preferred" items={serviceCriteria?.preferred_services} variant="secondary" />
            <CriteriaBadges label="Excluded" items={serviceCriteria?.excluded_services} variant="destructive" />
            <CriteriaRow label="Business Model" value={serviceCriteria?.business_model} />
            <CriteriaRow label="Customer Profile" value={serviceCriteria?.customer_profile} />
            <CriteriaBadges label="Other" items={serviceCriteria?.other} />
          </CriteriaCard>

          <CriteriaCard title="Geography" icon={MapPin} isEmpty={isGeographyEmpty(geographyCriteria)}>
            <CriteriaBadges label="Required Regions" items={geographyCriteria?.required_regions} variant="default" />
            <CriteriaBadges label="Preferred" items={geographyCriteria?.preferred_regions} variant="secondary" />
            <CriteriaBadges label="Excluded" items={geographyCriteria?.excluded_regions} variant="destructive" />
            <CriteriaRow label="Coverage" value={geographyCriteria?.coverage_type} />
            <CriteriaRow label="HQ Requirements" value={geographyCriteria?.hq_requirements} />
            <CriteriaBadges label="Other" items={geographyCriteria?.other} />
          </CriteriaCard>
        </div>
      )}
    </div>
  );
}
