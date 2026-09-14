// src/components/interview-room-view.tsx
import {
  ChevronLeft,
  ChevronRight,
  PhoneOff,
  SlidersHorizontal,
  Clock,
  Square,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LiveKitRoom,
  VideoConference,
  formatChatMessageLinks,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
  SessionConfigurationCard,
  type SessionType,
  type DSALanguage,
} from "@/components/session-configuration";
import { InterviewQuestionsPanel } from "@/components/questions-panel";
import PreInterviewModal from "@/components/pre-interview-model";
import { RoomConnectionErrorModal } from "@/components/connection-fallback";
import { CandidateLevel, Framework } from "@/types/types";
import { formatStatus, statusBadgeClass } from "@/lib/utils";

interface RoomCreds {
  roomToken: string;
  roomHost: string;
}

interface InterviewRoomViewProps {
  roomCreds: RoomCreds;
  hasStarted: boolean;
  candidateData: any;
  interviewStatus: string;
  isStartingSession: boolean;
  sessionError: string | null;
  roomConnectionError: string | null;
  setRoomConnectionError: (v: string | null) => void;
  handleLeaveRoom: () => void;
  handleStartInterview: () => void;
  elapsedLabel: string;
  isConfigPanelOpen: boolean;
  setIsConfigPanelOpen: (updater: boolean | ((v: boolean) => boolean)) => void;

  // session configuration
  sessionType: SessionType;
  dsaLanguage: DSALanguage | "";
  framework: Framework | "";
  level: CandidateLevel | "";
  dispatched: boolean;
  isDispatching: boolean;
  canDispatch: boolean;
  onSessionTypeChange: (value: SessionType) => void;
  onDsaLanguageChange: (lang: DSALanguage | "") => void;
  onFrameworkChange: (fw: Framework | "") => void;
  onLevelChange: (lvl: CandidateLevel | "") => void;
  onDispatch: () => void;

  // questions panel
  sessionId?: string;
  questionDifficulty: string;
  onQuestionDifficultyChange: (v: string) => void;
  questionCategory: string;
  onQuestionCategoryChange: (v: string) => void;
  questionCount: number;
  onQuestionCountChange: (v: number) => void;

  // end session
  showEndModal: boolean;
  setShowEndModal: (v: boolean) => void;
  handleEndInterview: () => void;
  isEndingSession: boolean;
}

export function InterviewRoomView({
  roomCreds,
  hasStarted,
  candidateData,
  interviewStatus,
  isStartingSession,
  sessionError,
  roomConnectionError,
  setRoomConnectionError,
  handleLeaveRoom,
  handleStartInterview,
  elapsedLabel,
  isConfigPanelOpen,
  setIsConfigPanelOpen,
  sessionType,
  dsaLanguage,
  framework,
  level,
  dispatched,
  isDispatching,
  canDispatch,
  onSessionTypeChange,
  onDsaLanguageChange,
  onFrameworkChange,
  onLevelChange,
  onDispatch,
  sessionId,
  questionDifficulty,
  onQuestionDifficultyChange,
  questionCategory,
  onQuestionCategoryChange,
  questionCount,
  onQuestionCountChange,
  showEndModal,
  setShowEndModal,
  handleEndInterview,
  isEndingSession,
}: InterviewRoomViewProps) {
  const serverUrl = roomCreds.roomHost.startsWith("ws")
    ? roomCreds.roomHost
    : `wss://${roomCreds.roomHost}`;

  if (roomConnectionError) {
    return (
      <RoomConnectionErrorModal
        roomConnectionError={roomConnectionError}
        setRoomConnectionError={setRoomConnectionError}
        handleLeaveRoom={handleLeaveRoom}
      />
    );
  }

  if (!hasStarted) {
    return (
      <PreInterviewModal
        candidateData={candidateData}
        interviewStatus={interviewStatus}
        isStartingSession={isStartingSession}
        sessionError={sessionError}
        handleLeaveRoom={handleLeaveRoom}
        handleStartInterview={handleStartInterview}
        statusBadgeClass={statusBadgeClass}
        formatStatus={formatStatus}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 h-screen w-screen bg-[#0a0d14] flex overflow-hidden">
      {/* Video area */}
      <div
        data-lk-theme="default"
        className="lk-room-container relative flex-1 min-w-0 h-full flex flex-col"
      >
        {/* Top bar overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 p-4 bg-gradient-to-b from-black/70 via-black/30 to-transparent">
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg
              bg-black/50 backdrop-blur-sm border border-white/10 text-sm text-slate-200
              hover:bg-black/70 hover:text-white transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">Leave &amp; back to details</span>
          </button>

          <div className="pointer-events-auto flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 text-sm text-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--chart-4))] animate-pulse" />
              <span className="font-display font-semibold tracking-wide truncate max-w-[160px]">
                {candidateData.full_name}
              </span>
              <span className="w-px h-3.5 bg-white/15" />
              <Badge
                className={`font-display font-semibold tracking-wide text-[11px] px-1.5 py-0 ${statusBadgeClass(interviewStatus)}`}
              >
                {formatStatus(interviewStatus)}
              </Badge>
              <span className="w-px h-3.5 bg-white/15" />
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="tabular-nums text-slate-300">{elapsedLabel}</span>
            </div>

            {!isConfigPanelOpen && (
              <button
                type="button"
                onClick={() => setIsConfigPanelOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/50 backdrop-blur-sm
                  border border-white/10 text-sm text-slate-200 hover:bg-black/70 hover:text-white transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Session panel</span>
              </button>
            )}
          </div>
        </div>

        <LiveKitRoom
          video
          audio
          token={roomCreds.roomToken}
          serverUrl={serverUrl}
          data-lk-theme="default"
          style={{ height: "100%" }}
          onDisconnected={handleLeaveRoom}
          onError={(err) => {
            console.error("[LiveKit] connection error:", err);
            setRoomConnectionError(
              "We couldn't connect to the interview room. Please check your connection and try again.",
            );
          }}
        >
          <div className="flex-1 min-h-0 h-full">
            <VideoConference chatMessageFormatter={formatChatMessageLinks} />
          </div>
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>

      {/* Toggle tab */}
      <button
        type="button"
        onClick={() => setIsConfigPanelOpen((v) => !v)}
        aria-label={isConfigPanelOpen ? "Close session panel" : "Open session panel"}
        className={`absolute top-1/2 -translate-y-1/2 z-30 flex items-center justify-center
          w-6 h-16 rounded-l-md bg-card border border-border/60 border-r-0
          text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-[right] duration-300 ease-in-out
          ${isConfigPanelOpen ? "right-[340px]" : "right-0"}`}
      >
        {isConfigPanelOpen ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Slide-out session panel */}
      <div
        className={`h-full bg-background border-l border-border/60 shrink-0 overflow-hidden
          transition-[width] duration-300 ease-in-out
          ${isConfigPanelOpen ? "w-[340px]" : "w-0"}`}
      >
        <div className="w-[340px] h-full flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-3 pb-0 space-y-3">
            <SessionConfigurationCard
              sessionType={sessionType}
              dsaLanguage={dsaLanguage}
              framework={framework}
              level={level}
              dispatched={dispatched}
              isDispatching={isDispatching}
              canDispatch={canDispatch}
              onSessionTypeChange={onSessionTypeChange}
              onDsaLanguageChange={onDsaLanguageChange}
              onFrameworkChange={onFrameworkChange}
              onLevelChange={onLevelChange}
              onDispatch={onDispatch}
            />

            {sessionId && (
              <InterviewQuestionsPanel
                sessionId={sessionId}
                difficulty={questionDifficulty}
                onDifficultyChange={onQuestionDifficultyChange}
                category={questionCategory}
                onCategoryChange={onQuestionCategoryChange}
                count={questionCount}
                onCountChange={onQuestionCountChange}
              />
            )}
          </div>

          {/* Footer action */}
          <div className="p-3 border-t border-border/60">
            <Button
              onClick={() => setShowEndModal(true)}
              variant="outline"
              className="w-full border-[hsl(var(--destructive)/0.4)] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] font-display font-semibold tracking-wide gap-2"
            >
              <Square className="h-4 w-4" />
              End session
            </Button>
          </div>
        </div>
      </div>

      {/* End Interview Confirmation Modal */}
      <Dialog open={showEndModal} onOpenChange={setShowEndModal}>
        <DialogContent className="bg-card border-border/60 text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display tracking-wide text-foreground">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--chart-3))]" />
              End interview session
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will mark the session as completed and record the end time. This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-[hsl(var(--chart-3)/0.1)] border border-[hsl(var(--chart-3)/0.3)] p-4 text-sm text-[hsl(var(--chart-3))]">
            Make sure you have submitted your evaluation scores before ending the session.
          </div>

          {sessionError && (
            <p className="text-sm text-[hsl(var(--destructive))]">{sessionError}</p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setShowEndModal(false)}
              className="font-display font-semibold tracking-wide text-muted-foreground hover:text-foreground"
              disabled={isEndingSession}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEndInterview}
              disabled={isEndingSession}
              className="bg-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.9)] text-[hsl(var(--destructive-foreground))] font-display font-semibold tracking-wide gap-2"
            >
              {isEndingSession ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {isEndingSession ? "Ending..." : "End session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}