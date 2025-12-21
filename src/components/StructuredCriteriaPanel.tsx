import { Badge } from "@/components/ui/badge";
import { DollarSign, MapPin, Briefcase, Users, Building2, Target, TrendingUp, Store, Landmark, MapPinned, Ruler, Ban, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

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
  max_locations?: string;
  min_revenue_per_location?: string;
  min_ebitda?: string;
  max_ebitda?: string;
  min_sqft_per_location?: string;
  geographic_scope?: string;
  geographic_rules?: string;
  deal_requirements?: string;
  acquisition_style?: string;
  exclusions?: string;
  fit_notes?: string;
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

// Priority color mapping
const priorityColors: Record<number, { bg: string; border: string; badge: string }> = {
  1: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', badge: 'bg-emerald-500 text-white' },
  2: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', badge: 'bg-blue-500 text-white' },
  3: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', badge: 'bg-amber-500 text-white' },
  4: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', badge: 'bg-purple-500 text-white' },
  5: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', badge: 'bg-slate-500 text-white' },
};

function getPriorityColor(priority?: number) {
  return priorityColors[priority || 5] || priorityColors[5];
}

function MetricChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/50 border text-xs">
      <Icon className="w-3 h-3 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function RequirementCallout({ icon: Icon, label, text, variant = "default" }: { 
  icon: React.ElementType; 
  label: string; 
  text?: string | null;
  variant?: "default" | "warning" | "info";
}) {
  if (!text) return null;
  
  const variantStyles = {
    default: "bg-muted/30 border-muted",
    warning: "bg-destructive/5 border-destructive/20",
    info: "bg-primary/5 border-primary/20"
  };
  
  return (
    <div className={cn("rounded-md p-2.5 border text-xs", variantStyles[variant])}>
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="w-3 h-3" />
        <span className="font-medium">{label}</span>
      </div>
      <p className="text-foreground/80">{text}</p>
    </div>
  );
}

function BuyerTypeCard({ buyerType, index }: { buyerType: BuyerType; index: number }) {
  const priority = buyerType.priority_order || (index + 1);
  const colors = getPriorityColor(priority);
  
  const getTypeIcon = (typeName?: string) => {
    const name = typeName?.toLowerCase() || '';
    if (name.includes('large') || name.includes('national') || name.includes('mso')) return Building2;
    if (name.includes('regional')) return Target;
    if (name.includes('pe') || name.includes('platform') || name.includes('seeker')) return TrendingUp;
    if (name.includes('small') || name.includes('local')) return Store;
    if (name.includes('strategic')) return Landmark;
    return Users;
  };
  
  const Icon = getTypeIcon(buyerType.type_name);
  
  // Combine EBITDA range
  const ebitdaRange = buyerType.min_ebitda && buyerType.max_ebitda 
    ? `${buyerType.min_ebitda} - ${buyerType.max_ebitda}`
    : buyerType.min_ebitda || buyerType.max_ebitda;
    
  // Combine location range
  const locationRange = buyerType.min_locations && buyerType.max_locations
    ? `${buyerType.min_locations} - ${buyerType.max_locations}`
    : buyerType.min_locations || buyerType.max_locations;
  
  return (
    <div className={cn(
      "rounded-xl border-2 p-4 transition-all hover:shadow-md",
      colors.bg,
      colors.border
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("p-1.5 rounded-lg", colors.bg)}>
            <Icon className="w-4 h-4 text-foreground" />
          </div>
          <div>
            <h4 className="font-semibold text-sm leading-tight">
              {buyerType.type_name || `Buyer Type ${index + 1}`}
            </h4>
            {buyerType.ownership_profile && (
              <span className="text-xs text-muted-foreground">{buyerType.ownership_profile}</span>
            )}
          </div>
        </div>
        <span className={cn(
          "px-2 py-0.5 rounded-full text-xs font-bold tabular-nums",
          colors.badge
        )}>
          #{priority}
        </span>
      </div>
      
      {/* Description */}
      {buyerType.description && (
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
          {buyerType.description}
        </p>
      )}
      
      {/* Key Metrics */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <MetricChip icon={MapPinned} label="Locations" value={locationRange} />
        <MetricChip icon={DollarSign} label="Rev/Loc" value={buyerType.min_revenue_per_location} />
        <MetricChip icon={TrendingUp} label="EBITDA" value={ebitdaRange} />
        <MetricChip icon={Ruler} label="Sq Ft" value={buyerType.min_sqft_per_location} />
        <MetricChip icon={MapPin} label="Scope" value={buyerType.geographic_scope} />
      </div>
      
      {/* Requirements Section */}
      <div className="space-y-2">
        <RequirementCallout 
          icon={MapPin} 
          label="Geographic Rules" 
          text={buyerType.geographic_rules} 
          variant="info"
        />
        <RequirementCallout 
          icon={Target} 
          label="Deal Requirements" 
          text={buyerType.deal_requirements || buyerType.acquisition_style || buyerType.typical_deal_size} 
          variant="default"
        />
        <RequirementCallout 
          icon={Lightbulb} 
          label="Fit Notes" 
          text={buyerType.fit_notes} 
          variant="info"
        />
        <RequirementCallout 
          icon={Ban} 
          label="Exclusions" 
          text={buyerType.exclusions} 
          variant="warning"
        />
      </div>
    </div>
  );
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

  // Sort buyer types by priority
  const sortedBuyerTypes = [...(buyerTypesCriteria?.buyer_types || [])].sort((a, b) => 
    (a.priority_order || 99) - (b.priority_order || 99)
  );

  return (
    <div className="space-y-6 mt-4">
      {/* Buyer Types Section */}
      {hasBuyerTypes && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Target Buyer Types</h3>
            <Badge variant="secondary" className="text-xs">
              {sortedBuyerTypes.length} {sortedBuyerTypes.length === 1 ? 'type' : 'types'}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedBuyerTypes.map((bt, i) => (
              <BuyerTypeCard key={i} buyerType={bt} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Other Criteria */}
      {hasOtherCriteria && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm">Additional Criteria</h4>
          </div>
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
        </div>
      )}
    </div>
  );
}
