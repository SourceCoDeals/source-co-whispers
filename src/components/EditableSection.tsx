import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Save, X, Loader2 } from "lucide-react";

interface EditableSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  editContent: React.ReactNode;
  onSave: () => Promise<void>;
  className?: string;
}

export function EditableSection({ 
  title, 
  icon, 
  children, 
  editContent, 
  onSave,
  className = ""
}: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className={`bg-card rounded-lg border p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          {icon}
          <h2 className="font-semibold text-lg">{title}</h2>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
              <X className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </div>
      {isEditing ? editContent : children}
    </div>
  );
}
