import React from "react";
import { PhoneOff, PlayCircle, Loader2 } from "lucide-react";
import { Candidate } from "@/hooks/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export interface PreInterviewModalProps {
  candidateData: Candidate;
  interviewStatus: string;
  isStartingSession: boolean;
  sessionError?: string | null;
  handleLeaveRoom: () => void;
  handleStartInterview: () => void;
  statusBadgeClass: (status: string) => string;
  formatStatus: (status: string) => string;
}

export const PreInterviewModal: React.FC<PreInterviewModalProps> = ({
  candidateData,
  interviewStatus,
  isStartingSession,
  sessionError,
  handleLeaveRoom,
  handleStartInterview,
  statusBadgeClass,
  formatStatus,
}) => {
  return (
    <div className="fixed inset-0 z-50 h-screen w-screen bg-[#0a0d14] flex items-center justify-center px-4">
      <button
        type="button"
        onClick={handleLeaveRoom}
        className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 text-sm text-slate-200 hover:bg-black/70 hover:text-white transition-colors"
      >
        <PhoneOff className="w-4 h-4" />
        <span className="hidden sm:inline">Leave &amp; back to details</span>
      </button>

      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <PlayCircle className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-xl font-semibold tracking-wide text-white">
            Ready to start the interview?
          </h2>
          <p className="text-sm text-slate-400">
            You&apos;ve joined the room with{" "}
            <span className="text-slate-200">{candidateData.full_name}</span>. The call, notes, and
            session tools stay hidden until you start the interview.
          </p>
        </div>

        <div className="flex items-center justify-center">
          <Badge
            className={`font-display font-semibold tracking-wide ${statusBadgeClass(
              interviewStatus,
            )}`}
          >
            {formatStatus(interviewStatus)}
          </Badge>
        </div>

        {sessionError && <p className="text-sm text-[hsl(var(--destructive))]">{sessionError}</p>}

        <Button
          onClick={handleStartInterview}
          disabled={isStartingSession}
          size="lg"
          className="w-full font-display font-semibold tracking-wide gap-2"
        >
          {isStartingSession ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="h-4 w-4" />
          )}
          {isStartingSession ? "Starting..." : "Start Interview"}
        </Button>
      </div>
    </div>
  );
};

export default PreInterviewModal;
