import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText, Target, MessageSquare, BookOpen } from "lucide-react";

interface TrackerTabsContainerProps {
  children: React.ReactNode;
  defaultTab?: string;
}

export function TrackerTabsContainer({ children, defaultTab = "buyers" }: TrackerTabsContainerProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="buyers" className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Buyers
        </TabsTrigger>
        <TabsTrigger value="deals" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Deals
        </TabsTrigger>
        <TabsTrigger value="criteria" className="flex items-center gap-2">
          <Target className="w-4 h-4" />
          Fit Criteria
        </TabsTrigger>
        <TabsTrigger value="notes" className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Notes
        </TabsTrigger>
        <TabsTrigger value="guide" className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          M&A Guide
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
}

export { TabsContent };
