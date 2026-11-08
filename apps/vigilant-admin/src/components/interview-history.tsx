import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Calendar,
  Clock,
  Star,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { useApplicationInterviewFeedback } from "@/hooks/use-application-interview-session";

interface InterviewHistoryCardProps {
  applicationID: string;
}

const formatInterviewType = (type: string) =>
  type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-success/10 text-success border-success/20";
    case "scheduled":
      return "bg-info/10 text-info border-info/20";
    case "in_progress":
      return "bg-warning/10 text-warning border-warning/20";
    case "cancelled":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const getRecommendationColor = (rec: string) => {
  switch (rec) {
    case "strong_yes":
      return "text-success";
    case "yes":
      return "text-success";
    case "neutral":
      return "text-warning";
    case "no":
      return "text-warning";
    case "strong_no":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
};

const ScoreBar = ({ label, score }: { label: string; score: number | null }) => {
  if (score === null) return null;
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? "bg-success" : pct >= 60 ? "bg-warning" : "bg-destructive";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{score}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const FeedbackPanel = ({
  feedback,
}: {
  feedback: NonNullable<
    ReturnType<typeof useApplicationInterviewFeedback>["sessions"][0]["feedback"]
  >;
}) => (
  <div className="mt-3 pt-3 border-t border-border space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Feedback</span>
      {feedback.overall_score !== null && (
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-warning fill-warning" />
          <span className="text-foreground text-sm font-semibold">
            {feedback.overall_score.toFixed(1)}
          </span>
          <span className="text-muted-foreground text-xs">/ 100</span>
        </div>
      )}
    </div>

    <div className="grid grid-cols-2 gap-2">
      <ScoreBar label="Technical" score={feedback.technical_skills_score} />
      <ScoreBar label="Communication" score={feedback.communication_score} />
      <ScoreBar label="Problem Solving" score={feedback.problem_solving_score} />
      <ScoreBar label="Cultural Fit" score={feedback.cultural_fit_score} />
    </div>

    {feedback.recommendation && (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Recommendation:</span>
        <span
          className={`font-medium capitalize ${getRecommendationColor(feedback.recommendation)}`}
        >
          {feedback.recommendation.replace(/_/g, " ")}
        </span>
      </div>
    )}

    {feedback.comments && (
      <div className="bg-card rounded-md p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
          <span>Comments</span>
        </div>
        <p className="text-foreground/80 text-xs leading-relaxed">{feedback.comments}</p>
      </div>
    )}
  </div>
);

const SessionCard = ({
  session,
}: {
  session: ReturnType<typeof useApplicationInterviewFeedback>["sessions"][0];
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasFeedback = session.feedback !== null;

  return (
    <div className="bg-background rounded-lg border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-foreground font-medium text-sm">
          {formatInterviewType(session.interview_type)}
        </span>
        <Badge className={getStatusColor(session.status)}>{session.status}</Badge>
      </div>

      <div className="flex items-center gap-4 text-muted-foreground text-sm">
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {new Date(session.scheduled_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {session.scheduled_duration} min
        </div>
      </div>

      {session.position && (
        <div className="text-muted-foreground text-xs">Position: {session.position}</div>
      )}

      {hasFeedback && (
        <>
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover transition-colors mt-1"
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {expanded ? "Hide feedback" : "View feedback"}
          </button>
          {expanded && <FeedbackPanel feedback={session.feedback!} />}
        </>
      )}

      {!hasFeedback && session.status === "completed" && (
        <p className="text-xs text-muted-foreground/70 italic">No feedback submitted yet</p>
      )}
    </div>
  );
};

export const InterviewHistory = ({ applicationID }: InterviewHistoryCardProps) => {
  const { sessions, total, isLoading, isError } = useApplicationInterviewFeedback(applicationID);

  console.log(sessions, "session");

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Interview History
        </CardTitle>
        <CardDescription>
          {isLoading
            ? "Loading interviews..."
            : total > 0
              ? `${total} interview${total > 1 ? "s" : ""}`
              : "No interviews yet"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-background rounded-lg border border-border p-4 animate-pulse h-20"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-8 text-destructive space-y-2">
            <History className="h-8 w-8 opacity-50" />
            <p className="text-sm">Failed to load interview history</p>
          </div>
        ) : sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground space-y-2">
            <History className="h-8 w-8 opacity-50" />
            <p className="text-sm">No interviews found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
