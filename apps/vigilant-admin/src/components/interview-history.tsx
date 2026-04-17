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
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "scheduled":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "in_progress":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "cancelled":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
};

const getRecommendationColor = (rec: string) => {
  switch (rec) {
    case "strong_yes":
      return "text-green-400";
    case "yes":
      return "text-emerald-400";
    case "neutral":
      return "text-yellow-400";
    case "no":
      return "text-orange-400";
    case "strong_no":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
};

const ScoreBar = ({ label, score }: { label: string; score: number | null }) => {
  if (score === null) return null;
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>{score}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
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
  <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Feedback</span>
      {feedback.overall_score !== null && (
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
          <span className="text-white text-sm font-semibold">
            {feedback.overall_score.toFixed(1)}
          </span>
          <span className="text-gray-500 text-xs">/ 100</span>
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
        <span className="text-gray-500">Recommendation:</span>
        <span
          className={`font-medium capitalize ${getRecommendationColor(feedback.recommendation)}`}
        >
          {feedback.recommendation.replace(/_/g, " ")}
        </span>
      </div>
    )}

    {feedback.comments && (
      <div className="bg-[#1a1f2e] rounded-md p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MessageSquare className="h-3 w-3" />
          <span>Comments</span>
        </div>
        <p className="text-gray-300 text-xs leading-relaxed">{feedback.comments}</p>
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
    <div className="bg-[#0f1419] rounded-lg border border-gray-700 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-white font-medium text-sm">
          {formatInterviewType(session.interview_type)}
        </span>
        <Badge className={getStatusColor(session.status)}>{session.status}</Badge>
      </div>

      <div className="flex items-center gap-4 text-gray-400 text-sm">
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
        <div className="text-gray-500 text-xs">Position: {session.position}</div>
      )}

      {hasFeedback && (
        <>
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors mt-1"
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
        <p className="text-xs text-gray-600 italic">No feedback submitted yet</p>
      )}
    </div>
  );
};

export const InterviewHistory = ({ applicationID }: InterviewHistoryCardProps) => {
  const { sessions, total, isLoading, isError } = useApplicationInterviewFeedback(applicationID);

  return (
    <Card className="bg-[#1a1f2e] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <History className="h-5 w-5 text-cyan-400" />
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
                className="bg-[#0f1419] rounded-lg border border-gray-700 p-4 animate-pulse h-20"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-8 text-red-400 space-y-2">
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
          <div className="flex flex-col items-center justify-center py-8 text-gray-500 space-y-2">
            <History className="h-8 w-8 opacity-50" />
            <p className="text-sm">No interviews found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
