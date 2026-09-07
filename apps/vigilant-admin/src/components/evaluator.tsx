import React, { useState, ChangeEvent } from "react";
import { CheckCircle2, ClipboardCheck, ThumbsDown, ThumbsUp, Meh } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInterview } from "@/hooks/use-interview";
import { CreateInterviewFeedbackPayload } from "@/hooks/types";

interface EvaluationData {
  technicalSkills: number;
  communication: number;
  problemSolving: number;
  culturalFit: number;
}

interface ScoreEvaluatorProps {
  interviewSessionId: string;
}

const RECOMMENDATIONS = [
  { value: "hire", label: "Hire", icon: ThumbsUp },
  { value: "consider", label: "Consider", icon: Meh },
  { value: "no_hire", label: "No hire", icon: ThumbsDown },
] as const;

type Recommendation = (typeof RECOMMENDATIONS)[number]["value"] | "";

function recommendationClass(value: Recommendation, active: boolean) {
  if (!active) {
    return "border-border/60 text-muted-foreground hover:border-border hover:text-foreground/80 bg-transparent";
  }
  switch (value) {
    case "hire":
      return "border-[hsl(var(--chart-4)/0.4)] bg-[hsl(var(--chart-4)/0.1)] text-[hsl(var(--chart-4))]";
    case "consider":
      return "border-[hsl(var(--chart-3)/0.4)] bg-[hsl(var(--chart-3)/0.1)] text-[hsl(var(--chart-3))]";
    case "no_hire":
      return "border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]";
    default:
      return "";
  }
}

function scoreTone(value: number) {
  if (value >= 80) return "text-[hsl(var(--chart-4))]";
  if (value >= 60) return "text-[hsl(var(--chart-3))]";
  return "text-[hsl(var(--destructive))]";
}

const ScoreEvaluator: React.FC<ScoreEvaluatorProps> = ({ interviewSessionId }) => {
  const { submitFeedbackAsync, isSubmittingFeedback, feedbackError } = useInterview();

  const [scores, setScores] = useState<EvaluationData>({
    technicalSkills: 85,
    communication: 90,
    problemSolving: 80,
    culturalFit: 88,
  });
  const [notes, setNotes] = useState("");
  const [recommendation, setRecommendation] = useState<Recommendation>("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSliderChange = (key: keyof EvaluationData, value: string): void => {
    setScores((prev) => ({ ...prev, [key]: parseInt(value, 10) }));
    setSubmitSuccess(false);
  };

  const overallScore: number = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length,
  );

  const handleSubmit = async () => {
    setSubmitSuccess(false);
    const payload: CreateInterviewFeedbackPayload = {
      interview_session_id: interviewSessionId,
      technical_skills_score: scores.technicalSkills,
      communication_score: scores.communication,
      problem_solving_score: scores.problemSolving,
      cultural_fit_score: scores.culturalFit,
      comments: notes.trim() || undefined,
      recommendation: recommendation || undefined,
    };
    try {
      await submitFeedbackAsync(payload);
      setSubmitSuccess(true);
    } catch {}
  };

  interface SliderProps {
    label: string;
    value: number;
    stateKey: keyof EvaluationData;
  }

  const ScoreSlider: React.FC<SliderProps> = ({ label, value, stateKey }) => (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-foreground/80 text-sm font-medium">{label}</span>
        <span className={`font-display font-bold text-sm ${scoreTone(value)}`}>{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          handleSliderChange(stateKey, e.target.value)
        }
        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary transition-all"
      />
    </div>
  );

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="font-display text-lg tracking-wide flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Evaluation Scores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-5">
          <ScoreSlider
            label="Technical skills"
            value={scores.technicalSkills}
            stateKey="technicalSkills"
          />
          <ScoreSlider
            label="Communication"
            value={scores.communication}
            stateKey="communication"
          />
          <ScoreSlider
            label="Problem solving"
            value={scores.problemSolving}
            stateKey="problemSolving"
          />
          <ScoreSlider label="Cultural fit" value={scores.culturalFit} stateKey="culturalFit" />
        </div>

        <div className="pt-4 border-t border-border/60 flex items-center justify-between">
          <span className="text-muted-foreground text-sm font-display font-semibold tracking-wide uppercase">
            Overall score
          </span>
          <span className={`font-display font-black text-3xl ${scoreTone(overallScore)}`}>
            {overallScore}
            <span className="text-muted-foreground text-lg font-medium ml-1">/100</span>
          </span>
        </div>

        <div className="pt-4 border-t border-border/60 space-y-3">
          <p className="text-muted-foreground text-sm">Recommendation</p>
          <div className="flex gap-2">
            {RECOMMENDATIONS.map(({ value, label, icon: Icon }) => {
              const active = recommendation === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setRecommendation(value);
                    setSubmitSuccess(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-display font-semibold tracking-wide transition-colors ${recommendationClass(
                    value,
                    active,
                  )}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">Notes</p>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSubmitSuccess(false);
            }}
            placeholder="Add observations, strengths, areas of concern…"
            rows={4}
            className="w-full rounded-md bg-input/50 border border-border/60 p-3 text-sm text-foreground placeholder:text-muted-foreground/70 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
          />
        </div>

        {feedbackError && <p className="text-sm text-[hsl(var(--destructive))]">{feedbackError}</p>}
        {submitSuccess && (
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--chart-4))]">
            <CheckCircle2 className="h-4 w-4" />
            Feedback submitted successfully.
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmittingFeedback}
          className="w-full font-display font-semibold tracking-wide gap-2"
        >
          {isSubmittingFeedback ? "Submitting…" : "Submit feedback"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ScoreEvaluator;
