import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Mail,
  Phone,
  Award,
  FileText,
  Loader2,
  Square,
  AlertTriangle,
  JoystickIcon,
  ChevronLeft,
  ChevronRight,
  PhoneOff,
  SlidersHorizontal,
  Clock,
  NotebookPen,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useCandidate } from "@/hooks/use-candidates";
import { useInterview } from "@/hooks/use-interview";
import { pushToCandidate } from "@/lib/axios";
import { CandidateLevel, Framework } from "@/types/types";
import ScoreEvaluator from "@/components/evaluator";
import { SystemDiagnostics } from "./process-report";
import { BracketCorners } from "@/components/bracket-conner";
import {
  SessionConfigurationCard,
  type SessionType,
  type DSALanguage,
} from "@/components/session-configuration";
import { useSessionFeedback } from "@/hooks/use-session-feedback";
import FeedbackSummary from "@/components/feedback-summary";

interface RoomCreds {
  roomToken: string;
  roomHost: string;
}

function formatStatus(status: string) {
  if (!status) return "Unknown";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "in_progress":
      return "bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] border border-[hsl(var(--chart-4)/0.3)]";
    case "completed":
      return "bg-muted text-muted-foreground border border-border";
    case "scheduled":
    default:
      return "bg-[hsl(var(--chart-3)/0.15)] text-[hsl(var(--chart-3))] border border-[hsl(var(--chart-3)/0.3)]";
  }
}

export function InterviewDetail() {
  const { candidateId, sessionId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useCandidate(candidateId);
  const {
    startSessionAsync,
    endSessionAsync,
    isStartingSession,
    isEndingSession,
    sessions,
    sessionStatus,
    sendEmailAsync,
    getRoomTokenAsync,
    isFetchingRoomToken,
    roomTokenError,
  } = useInterview(candidateId, sessionId);

  const candidateData = data?.candidate;
  const isOnline = data?.is_online;

  const [dsaLanguage, setDsaLanguage] = useState<DSALanguage | "">("");
  const [sessionType, setSessionType] = useState<SessionType>("");
  const [level, setLevel] = useState<CandidateLevel | "">("");
  const [framework, setFramework] = useState<Framework | "">("");
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [upcoming, setUpcoming] = useState(false);
  // interviewStatus mirrors the DB's `status` column (scheduled / in_progress / completed),
  // seeded from sessionStatus and updated optimistically on start/end.
  const [interviewStatus, setInterviewStatus] = useState<string>("");
  const [showEndModal, setShowEndModal] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const currentSessionApplicationId = sessions.find(
    (s) => s.session_id === sessionId,
  )?.application_id;

  const { feedback: existingFeedback, isLoadingFeedback } = useSessionFeedback(
    currentSessionApplicationId,
    sessionId,
  );

  console.log(existingFeedback, "existingFeedback");
  // --- in-page room state (replaces navigating to /interview/:sessionId/room) ---
  const [roomCreds, setRoomCreds] = useState<RoomCreds | null>(null);
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomConnectionError, setRoomConnectionError] = useState<string | null>(null);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(true);
  const [joinedAt, setJoinedAt] = useState<number | null>(null);
  const [elapsedLabel, setElapsedLabel] = useState("00:00");
  const [interviewNotes, setInterviewNotes] = useState("");
  // -------------------------------------------------------------------------------

  const canDispatch =
    sessionType === "framework"
      ? level !== "" && framework !== ""
      : sessionType === "dsa"
        ? dsaLanguage !== ""
        : false;

  // The interview is considered "live" for gating purposes only once the
  // admin has explicitly started it — joining the LiveKit room alone
  // (isInRoom) is not enough to reveal the call/notes/panel UI.
  const hasStarted = interviewStatus === "in_progress" || interviewStatus === "completed";

  useEffect(() => {
    if (sessionStatus) {
      setInterviewStatus(sessionStatus);
    }
  }, [sessionStatus]);

  useEffect(() => {
    const nextInterview = sessions
      .filter((session) => session.status === "scheduled" && session.is_upcoming)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

    if (nextInterview && nextInterview?.is_upcoming) {
      setUpcoming(nextInterview.is_upcoming);
    }
  }, [sessions]);

  // Call-duration ticker only runs once the interview has actually started,
  // not just from the moment the admin joined the room.
  useEffect(() => {
    if (!isInRoom || !joinedAt || !hasStarted) return;
    const tick = () => {
      const secs = Math.max(0, Math.floor((Date.now() - joinedAt) / 1000));
      const m = Math.floor(secs / 60)
        .toString()
        .padStart(2, "0");
      const s = (secs % 60).toString().padStart(2, "0");
      setElapsedLabel(`${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isInRoom, joinedAt, hasStarted]);

  const handleSessionTypeChange = (value: SessionType) => {
    setSessionType(value);
    setDispatched(false);
    setLevel("");
    setFramework("");
    setDsaLanguage("");
  };

  const handleDispatch = async () => {
    if (!canDispatch || !candidateId) return;
    setIsDispatching(true);
    try {
      if (sessionType === "framework") {
        await pushToCandidate(candidateId, "session_config", {
          type: "framework",
          framework,
          level,
        });
      } else if (sessionType === "dsa") {
        await pushToCandidate(candidateId, "session_config", {
          type: "dsa",
          language: dsaLanguage,
        });
      }
      setDispatched(true);
    } catch (err) {
      console.error("Failed to dispatch:", err);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleStartInterview = async () => {
    if (!sessionId) return;
    setSessionError(null);
    try {
      await startSessionAsync(sessionId);
      setInterviewStatus("in_progress");
      // Start the call clock from the moment the interview is actually started,
      // not from when the admin merely joined the room.
      setJoinedAt(Date.now());
    } catch (err: any) {
      setSessionError(err?.response?.data?.error ?? "Failed to start interview");
    }
  };

  const handleEndInterview = async () => {
    if (!sessionId) return;
    setSessionError(null);
    try {
      await endSessionAsync(sessionId);
      setInterviewStatus("completed");
      setShowEndModal(false);
      // if we were in the room when the session ended, drop out of it
      setIsInRoom(false);
      setRoomCreds(null);
    } catch (err: any) {
      setSessionError(err?.response?.data?.error ?? "Failed to end interview");
    }
  };

  // Joins the room INLINE — fetches the interviewer's LiveKit token and
  // switches this page into the full-screen room view. This only connects
  // to the room; it does NOT start the interview. The full-screen view
  // shows a "Start Interview" gate until handleStartInterview is called.
  const handleJoinInterview = async () => {
    if (!sessionId) return;
    setJoinError(null);
    setRoomConnectionError(null);
    try {
      const creds = await getRoomTokenAsync(sessionId);
      // API returns snake_case (session_id, room_token, room_host) —
      // see InterviewRoomTokenResponse in use-interview.ts
      setRoomCreds({ roomToken: creds.room_token, roomHost: creds.room_host });
      setIsInRoom(true);
      setJoinedAt(Date.now());
    } catch (err: any) {
      setJoinError(err?.response?.data?.error ?? "Failed to join interview room");
    }
  };

  const handleLeaveRoom = () => {
    setIsInRoom(false);
    setRoomCreds(null);
    setJoinedAt(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading candidate details...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-[hsl(var(--destructive))] text-lg">Error: {error?.message}</div>
      </div>
    );
  }

  if (!candidateData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-lg">Candidate not found</div>
      </div>
    );
  }

  // --- Full-screen in-page room view ---
  if (isInRoom && roomCreds) {
    const serverUrl = roomCreds.roomHost.startsWith("ws")
      ? roomCreds.roomHost
      : `wss://${roomCreds.roomHost}`;

    if (roomConnectionError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
          <div className="max-w-sm w-full text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Couldn't join the interview</h2>
            <p className="text-sm text-slate-400">{roomConnectionError}</p>
            <div className="flex gap-2">
              <Button
                onClick={() => setRoomConnectionError(null)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
              >
                Try again
              </Button>
              <Button
                variant="ghost"
                onClick={handleLeaveRoom}
                className="w-full py-2.5 rounded-xl text-slate-300"
              >
                Back to details
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // --- Gate: joined the room but hasn't started the interview yet.
    // Nothing else (video, notes, candidate panel) is shown until this
    // is cleared by clicking "Start Interview".
    if (!hasStarted) {
      return (
        <div className="fixed inset-0 z-50 h-screen w-screen bg-[#0a0d14] flex items-center justify-center px-4">
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg
              bg-black/50 backdrop-blur-sm border border-white/10 text-sm text-slate-200
              hover:bg-black/70 hover:text-white transition-colors"
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
                You've joined the room with{" "}
                <span className="text-slate-200">{candidateData.full_name}</span>. The call, notes,
                and session tools stay hidden until you start the interview.
              </p>
            </div>

            <div className="flex items-center justify-center">
              <Badge
                className={`font-display font-semibold tracking-wide ${statusBadgeClass(interviewStatus)}`}
              >
                {formatStatus(interviewStatus)}
              </Badge>
            </div>

            {sessionError && (
              <p className="text-sm text-[hsl(var(--destructive))]">{sessionError}</p>
            )}

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
    }

    return (
      <div className="fixed inset-0 z-50 h-screen w-screen bg-[#0a0d14] flex overflow-hidden">
        {/* Video area */}
        <div
          data-lk-theme="default"
          className="lk-room-container relative flex-1 min-w-0 h-full flex flex-col"
        >
          {/* Top bar overlay — sits above the video, doesn't block it */}
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

        {/* Toggle tab, attached to the panel's edge */}
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

        {/* Slide-out session panel — fits its content, no dead space */}
        <div
          className={`h-full bg-background border-l border-border/60 shrink-0 overflow-hidden
            transition-[width] duration-300 ease-in-out
            ${isConfigPanelOpen ? "w-[340px]" : "w-0"}`}
        >
          <div className="w-[340px] h-full flex flex-col">
            <div className="shrink-0 overflow-y-auto p-3 pb-0 space-y-3">
              <SessionConfigurationCard
                sessionType={sessionType}
                dsaLanguage={dsaLanguage}
                framework={framework}
                level={level}
                dispatched={dispatched}
                isDispatching={isDispatching}
                canDispatch={canDispatch}
                onSessionTypeChange={handleSessionTypeChange}
                onDsaLanguageChange={(lang) => {
                  setDsaLanguage(lang);
                  setDispatched(false);
                }}
                onFrameworkChange={(fw) => {
                  setFramework(fw);
                  setDispatched(false);
                }}
                onLevelChange={(lvl) => {
                  setLevel(lvl);
                  setDispatched(false);
                }}
                onDispatch={handleDispatch}
              />

              {/* Candidate quick-reference — keeps key info visible without leaving the call */}
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display font-semibold tracking-wide text-foreground/90">
                    Candidate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2 text-foreground/80">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{candidateData.email}</span>
                  </div>
                  {candidateData.phone_number && (
                    <div className="flex items-center gap-2 text-foreground/80">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{candidateData.phone_number}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-muted-foreground text-xs">Experience</span>
                    <span className="text-foreground/80 text-xs">
                      {candidateData.experience_years
                        ? `${candidateData.experience_years} yrs`
                        : "Not specified"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notes — grows to fill the remaining height instead of leaving it empty */}
            <div className="flex-1 min-h-0 p-3 flex flex-col">
              <Card className="border-border/60 flex-1 min-h-0 flex flex-col">
                <CardHeader className="pb-2 shrink-0">
                  <CardTitle className="text-sm font-display font-semibold tracking-wide text-foreground/90 flex items-center gap-2">
                    <NotebookPen className="h-3.5 w-3.5 text-muted-foreground" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 pb-3">
                  <textarea
                    value={interviewNotes}
                    onChange={(e) => setInterviewNotes(e.target.value)}
                    placeholder="Jot down observations as you go..."
                    className="w-full h-full resize-none rounded-md bg-input/50 border border-border/60 p-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Footer action, anchored to the bottom of the panel instead of empty space */}
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

        {/* End Interview Confirmation Modal (also reachable from the in-room panel) */}
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
  // --- end full-screen room view ---

  const skillsArray = candidateData.skills
    ? candidateData.skills.split(",").map((s) => s.trim())
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-[1440px] space-y-6">
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

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/interviews")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-[28px] font-bold tracking-wide text-foreground">
                  {candidateData.full_name}
                </h1>
                {interviewStatus && (
                  <Badge
                    className={`font-display font-semibold tracking-wide ${statusBadgeClass(interviewStatus)}`}
                  >
                    {formatStatus(interviewStatus)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-muted-foreground text-sm">{candidateData.email}</p>
                {isOnline && (
                  <span className="flex items-center gap-1 text-[hsl(var(--chart-4))] text-sm">
                    <span className="h-2 w-2 rounded-full bg-[hsl(var(--chart-4))]" />
                    Online
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-display text-lg tracking-wide flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Profile Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm">Experience</p>
                    <p className="text-foreground mt-1">
                      {candidateData.experience_years
                        ? `${candidateData.experience_years} years`
                        : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Member Since</p>
                    <p className="text-foreground mt-1">
                      {new Date(candidateData.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {skillsArray.length > 0 ? (
                      skillsArray.map((skill) => (
                        <span
                          key={skill}
                          className="bg-muted border border-border px-3 py-1 rounded-full text-muted-foreground text-sm"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground/70 text-sm">No skills listed</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm mb-2">Contact Information</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-foreground/80">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{candidateData.email}</span>
                    </div>
                    {candidateData.phone_number && (
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{candidateData.phone_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                {(candidateData.github_url || candidateData.resume_url) && (
                  <div className="pt-2 border-t border-border/60">
                    <p className="text-muted-foreground text-sm mb-2">Links</p>
                    <div className="space-y-2">
                      {candidateData.github_url && (
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm"
                        >
                          <FileText className="h-4 w-4" />
                          GitHub Profile
                        </a>
                      )}
                      {candidateData.resume_url && (
                        <a
                          href={candidateData.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm"
                        >
                          <FileText className="h-4 w-4" />
                          View Resume
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Account Status</span>
                    <Badge
                      className={`font-display font-semibold tracking-wide ${
                        candidateData.is_active
                          ? "bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] border border-[hsl(var(--chart-4)/0.3)]"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {candidateData.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {sessionId && <SystemDiagnostics sessionId={sessionId} />}
            {sessionId &&
              (interviewStatus === "in_progress" || interviewStatus === "completed") &&
              (isLoadingFeedback ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  Loading feedback...
                </div>
              ) : existingFeedback ? (
                <FeedbackSummary feedback={existingFeedback} />
              ) : (
                <ScoreEvaluator interviewSessionId={sessionId} />
              ))}
          </div>
          <div className="space-y-6">
            <Card className="relative border-border/60">
              <BracketCorners tone="primary" />
              <CardHeader>
                <CardTitle className="font-display text-lg tracking-wide flex items-center justify-between">
                  Quick Actions
                  {interviewStatus && (
                    <Badge
                      className={`font-display font-semibold tracking-wide text-[11px] ${statusBadgeClass(interviewStatus)}`}
                    >
                      {formatStatus(interviewStatus)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  disabled={!sessionId || isFetchingRoomToken}
                  onClick={handleJoinInterview}
                  className="w-full font-display font-semibold tracking-wide shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.55)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isFetchingRoomToken ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <JoystickIcon className="h-4 w-4 mr-2" />
                  )}
                  {isFetchingRoomToken ? "Joining..." : "Join Interview"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  You'll join the room first — the call and notes stay hidden until you start the
                  interview.
                </p>
                {(joinError || roomTokenError) && (
                  <p className="text-xs text-[hsl(var(--destructive))]">
                    {joinError ?? roomTokenError}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
