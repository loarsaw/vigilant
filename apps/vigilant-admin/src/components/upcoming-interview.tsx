import { Calendar, Video, Clock, Loader2, CalendarX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInterview } from "@/hooks/use-interview";
import { useEffect, useState } from "react";

interface UpcomingInterviewProps {
  candidateId: string;
  candidateName: string;
}

export function UpcomingInterview({ candidateId }: UpcomingInterviewProps) {
  const { sessions, isLoading, setSessionFilter } = useInterview(candidateId);
  const [interviewTitle, setInterviewTitle] = useState("");

  useEffect(() => {
    setSessionFilter("upcoming");
  }, []);

  const nextInterview = sessions
    .filter((session) => session.status === "scheduled" && session.is_upcoming)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

  useEffect(() => {
    if (nextInterview?.interview_type) {
      setInterviewTitle(
        nextInterview.interview_type
          .split("_")
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
      );
    }
  }, [nextInterview?.interview_type]);

  console.log(nextInterview, "next interview");

  return (
    <Card className="bg-[#1a1f2e] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Next Interview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        )}

        {!isLoading && nextInterview && (
          <>
            <div className="bg-[#0f1419] rounded-lg border border-gray-700 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium text-sm">{interviewTitle}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                  {nextInterview.status}
                </span>
              </div>

              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Calendar className="h-4 w-4" />
                {new Date(nextInterview.scheduled_at).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZoneName: "short",
                })}
              </div>

              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Clock className="h-4 w-4" />
                {nextInterview.scheduled_duration} min
              </div>
            </div>

            <button
              onClick={() => {
                if (window.api) {
                  console.log(nextInterview?.interview_url, "interview url");
                  window.api.openExternal(nextInterview.interview_url);
                } else {
                  window.open(nextInterview.interview_url, "_blank");
                }
              }}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors"
            >
              <Video className="h-4 w-4" />
              Join Interview
            </button>
          </>
        )}

        {!isLoading && !nextInterview && (
          <div className="flex flex-col items-center justify-center py-4 text-gray-500 space-y-2">
            <CalendarX className="h-8 w-8" />
            <p className="text-sm">No upcoming interviews</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
