import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuestionCategory, QuestionSet } from "@/hooks/types";
import { useGenerateQuestions } from "@/hooks/use-questions";

interface InterviewQuestionsPanelProps {
  sessionId: string;
  difficulty: string;
  onDifficultyChange: (difficulty: string) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  count: number;
  onCountChange: (count: number) => void;
}

const CATEGORY_LABEL: Record<QuestionCategory, string> = {
  coding: "Coding",
  system_design: "System Design",
  behavioral: "Behavioral",
  conceptual: "Conceptual",
};

export function InterviewQuestionsPanel({
  sessionId,
  difficulty,
  onDifficultyChange,
  category,
  onCategoryChange,
  count,
  onCountChange,
}: InterviewQuestionsPanelProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const { generateQuestions, isGeneratingQuestions, generateQuestionsError } =
    useGenerateQuestions(sessionId);

  const { data } = useQuery<QuestionSet>({
    queryKey: ["interview-questions", sessionId],
    enabled: false,
  });

  const handleGenerate = () => {
    setExpandedIdx(null);
    generateQuestions({
      // Blank difficulty is allowed — omitted from the request rather than
      // sent as "", letting the backend pick a sensible default.
      difficulty: difficulty || undefined,
      count,
      category: category === "mixed" ? undefined : category,
    });
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg tracking-wide text-primary">
          <ListChecks className="w-5 h-5" />
          Interview Questions
        </CardTitle>
        <CardDescription className="flex items-center justify-between gap-2">
          <span>Generate a fresh set of questions for this session</span>
          {data && (
            <Badge className="font-display font-semibold tracking-wide bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] border border-[hsl(var(--chart-4)/0.3)] shrink-0">
              Attempt #{data.attempt_number}
            </Badge>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">
              Category
            </p>
            <Select value={difficulty} onValueChange={onDifficultyChange}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Any difficulty..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="intern">Intern</SelectItem>
                <SelectItem value="junior">Junior</SelectItem>
                <SelectItem value="sde1">SDE1</SelectItem>
                <SelectItem value="sde2">SDE2</SelectItem>
                <SelectItem value="sde3">SDE3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">
              Count
            </p>
            <Input
              type="number"
              min={1}
              max={15}
              value={count}
              onChange={(e) => onCountChange(Number(e.target.value))}
              className="bg-input border-border"
            />
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGeneratingQuestions}
          className="w-full font-display font-semibold tracking-wide"
          variant={data ? "outline" : "default"}
        >
          {isGeneratingQuestions ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : data ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </>
          ) : (
            "Generate Questions"
          )}
        </Button>

        {!difficulty && (
          <p className="text-xs text-muted-foreground">
            No difficulty selected — questions will be generated at a general difficulty.
          </p>
        )}

        {generateQuestionsError && (
          <p className="text-xs text-[hsl(var(--destructive))]">{generateQuestionsError}</p>
        )}

        {data && (
          <div
            className="space-y-2 max-h-[360px] overflow-y-auto pr-1
      [&::-webkit-scrollbar]:w-1.5
      [&::-webkit-scrollbar-track]:bg-transparent
      [&::-webkit-scrollbar-thumb]:bg-border
      [&::-webkit-scrollbar-thumb]:rounded-full
      hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50"
          >
            {data.questions.map((q, idx) => {
              const isOpen = expandedIdx === idx;
              return (
                <div
                  key={idx}
                  className="rounded-md border border-border/60 bg-secondary/40 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedIdx(isOpen ? null : idx)}
                    className="w-full flex items-start justify-between gap-2 p-3 text-left"
                  >
                    <div className="min-w-0">
                      <span className="inline-block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                        {CATEGORY_LABEL[q.category] ?? q.category}
                      </span>
                      <p className="text-sm text-foreground">{q.question}</p>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground mt-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground mt-1" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2 text-xs text-muted-foreground">
                      {q.follow_ups.length > 0 && (
                        <div>
                          <p className="font-medium text-foreground/80 mb-1">Follow-ups</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            {q.follow_ups.map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {q.evaluation_tips && (
                        <div>
                          <p className="font-medium text-foreground/80 mb-1">What to look for</p>
                          <p>{q.evaluation_tips}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
