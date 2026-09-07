// src/components/feedback-summary.tsx
import React from "react";
import { Star, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FeedbackSummaryProps {
  feedback: any;
}

const RECOMMENDATION_LABEL: Record<string, string> = {
  hire: "Hire",
  consider: "Consider",
  no_hire: "No hire",
};

function scoreBarTone(value: number) {
  if (value >= 80) return "bg-[hsl(var(--chart-4))]";
  if (value >= 60) return "bg-[hsl(var(--chart-3))]";
  return "bg-[hsl(var(--destructive))]";
}

const ScoreRow: React.FC<{ label: string; value: number | null | undefined }> = ({
  label,
  value,
}) => {
  const v = value ?? 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-foreground/80 text-sm shrink-0 w-[110px]">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${scoreBarTone(v)}`}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="text-foreground/70 text-xs font-medium w-7 text-right shrink-0">
        {value == null ? "—" : v}
      </span>
    </div>
  );
};

const FeedbackSummary: React.FC<FeedbackSummaryProps> = ({ feedback }) => {
  const recLabel = feedback.recommendation
    ? (RECOMMENDATION_LABEL[feedback.recommendation] ?? feedback.recommendation)
    : null;

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        {/* Header: label + star rating, inline */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-display font-semibold tracking-widest uppercase">
            Feedback
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-[hsl(var(--chart-3))] text-[hsl(var(--chart-3))]" />
            <span className="font-display font-bold text-foreground">
              {feedback.overall_score != null ? feedback.overall_score.toFixed(1) : "—"}
            </span>
            <span className="text-muted-foreground text-xs">/ 100</span>
          </span>
        </div>

        {/* Two-column score grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
          <ScoreRow label="Technical" value={feedback.technical_skills_score} />
          <ScoreRow label="Communication" value={feedback.communication_score} />
          <ScoreRow label="Problem Solving" value={feedback.problem_solving_score} />
          <ScoreRow label="Cultural Fit" value={feedback.cultural_fit_score} />
        </div>

        {/* Recommendation, single inline line */}
        {recLabel && (
          <p className="text-sm text-muted-foreground">
            Recommendation: <span className="text-foreground font-medium">{recLabel}</span>
          </p>
        )}

        {/* Comments, subtle box */}
        {feedback.comments && (
          <div className="rounded-md bg-muted/40 border border-border/50 p-3 space-y-1">
            <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              Comments
            </span>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{feedback.comments}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedbackSummary;
