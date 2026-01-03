import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { ComprehensiveValidationResult } from "@/lib/criteriaValidation";

interface CriteriaValidationAlertProps {
  validation: ComprehensiveValidationResult;
  onFixRequest?: (field: string) => void;
  compact?: boolean;
}

export function CriteriaValidationAlert({ 
  validation, 
  onFixRequest,
  compact = false 
}: CriteriaValidationAlertProps) {
  const [expanded, setExpanded] = useState(false);

  if (validation.status === 'complete' && validation.allErrors.length === 0) {
    if (compact) return null;
    
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-700">Criteria Complete</AlertTitle>
        <AlertDescription className="text-green-600">
          All required criteria defined. Scoring will be accurate.
        </AlertDescription>
      </Alert>
    );
  }

  const getVariant = () => {
    if (validation.allErrors.length > 0) return 'destructive';
    if (validation.status === 'insufficient') return 'destructive';
    return 'default';
  };

  const getIcon = () => {
    if (validation.allErrors.length > 0) return <XCircle className="h-4 w-4" />;
    if (validation.status === 'insufficient') return <AlertCircle className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  const getTitle = () => {
    if (validation.allErrors.length > 0) return 'Validation Errors';
    if (validation.status === 'insufficient') return 'Insufficient Criteria';
    return 'Criteria Needs Review';
  };

  const getDescription = () => {
    if (validation.status === 'insufficient') {
      return 'Cannot perform accurate scoring without additional criteria.';
    }
    if (validation.allErrors.length > 0) {
      return `${validation.allErrors.length} error(s) need to be fixed.`;
    }
    return `${validation.allWarnings.length} warning(s) may affect scoring accuracy.`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge 
          variant={validation.status === 'complete' ? 'default' : validation.status === 'partial' ? 'secondary' : 'destructive'}
        >
          {validation.status === 'complete' ? 'Complete' : 
           validation.status === 'partial' ? 'Partial' : 'Insufficient'}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {validation.overallScore}% complete
        </span>
        {validation.allErrors.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            {validation.allErrors.length} error(s)
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Alert variant={getVariant()} className="relative">
      {getIcon()}
      <AlertTitle className="flex items-center justify-between">
        <span>{getTitle()}</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {validation.overallScore}% complete
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </AlertTitle>
      <AlertDescription>
        {getDescription()}
        
        {expanded && (
          <div className="mt-3 space-y-3">
            {/* Errors */}
            {validation.allErrors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-destructive">Errors:</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  {validation.allErrors.map((error, i) => (
                    <li key={i} className="text-destructive">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Placeholders */}
            {validation.allPlaceholders.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-destructive">Placeholders Detected:</p>
                <div className="flex flex-wrap gap-1">
                  {validation.allPlaceholders.map((ph, i) => (
                    <Badge key={i} variant="destructive" className="text-xs">{ph}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {validation.allWarnings.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-yellow-600">Warnings:</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  {validation.allWarnings.map((warning, i) => (
                    <li key={i} className="text-yellow-600">{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Critical Missing */}
            {validation.criticalMissing.length > 0 && onFixRequest && (
              <div className="space-y-1">
                <p className="text-xs font-medium">Missing Required Fields:</p>
                <div className="flex flex-wrap gap-1">
                  {validation.criticalMissing.map((field, i) => (
                    <Button 
                      key={i}
                      variant="outline" 
                      size="sm" 
                      className="h-6 text-xs"
                      onClick={() => onFixRequest(field)}
                    >
                      Add {field.replace(/_/g, ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t">
              <div className="text-center">
                <p className="text-xs font-medium">Size</p>
                <Badge variant={validation.size.valid ? 'default' : 'secondary'} className="text-xs">
                  {validation.size.completenessScore}%
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium">Service</p>
                <Badge variant={validation.service.valid ? 'default' : 'secondary'} className="text-xs">
                  {validation.service.completenessScore}%
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium">Geography</p>
                <Badge variant={validation.geography.valid ? 'default' : 'secondary'} className="text-xs">
                  {validation.geography.completenessScore}%
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium">Buyer Types</p>
                <Badge variant={validation.buyerTypes.valid ? 'default' : 'secondary'} className="text-xs">
                  {validation.buyerTypes.completenessScore}%
                </Badge>
              </div>
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
