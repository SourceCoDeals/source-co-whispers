import { AlertCircle, HelpCircle, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FollowupQuestionsPanelProps {
  questions: string[];
}

export function FollowupQuestionsPanel({ questions }: FollowupQuestionsPanelProps) {
  if (!questions?.length) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-lg">
          <Phone className="w-5 h-5" />
          Recommended Follow-up Questions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Some financial data needs clarification. Ask these questions on the next call:
          </p>
        </div>
        <ul className="space-y-2">
          {questions.map((question, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-sm text-foreground"
            >
              <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
              {question}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
