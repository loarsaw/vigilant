import { Calendar, Video, Clock, Loader2, CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Interview, useInterview } from "@/hooks/use-interview";

interface UpcomingInterviewProps {
  candidateId: string;
  candidateName: string;
}

export function UpcomingInterview({ candidateId }: UpcomingInterviewProps) {
  const { interviews, isLoading } = useInterview(candidateId);

  const nextInterview = interviews
    .filter((i: Interview) => i.status === "scheduled")
    .sort(
      (a: Interview, b: Interview) =>
        new Date(`${a.scheduled_date}T${a.scheduled_time}`).getTime() -
        new Date(`${b.scheduled_date}T${b.scheduled_time}`).getTime(),
    )[0];

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
          <div className="bg-[#0f1419] rounded-lg border border-gray-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium text-sm">{nextInterview.interview_type}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                {nextInterview.status}
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Calendar className="h-4 w-4" />
              {new Date(nextInterview.scheduled_date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>

            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Clock className="h-4 w-4" />
              {nextInterview.scheduled_time}
            </div>
          </div>
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
