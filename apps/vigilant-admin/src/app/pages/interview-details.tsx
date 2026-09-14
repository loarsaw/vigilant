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
import { useCandidate } from "@/hooks/use-candidates";
import { useInterview } from "@/hooks/use-interview";
import { pushToCandidate } from "@/lib/axios";
import { CandidateLevel, Framework } from "@/types/types";
import ScoreEvaluator from "@/components/evaluator";
import { SystemDiagnostics } from "./process-report";
import { BracketCorners } from "@/components/bracket-conner";
import { type SessionType, type DSALanguage } from "@/components/session-configuration";
import { useSessionFeedback } from "@/hooks/use-session-feedback";
import FeedbackSummary from "@/components/feedback-summary";
import { formatStatus, statusBadgeClass } from "@/lib/utils";
import { InterviewRoomView } from "@/components/interview-room";

interface RoomCreds {
  roomToken: string;
  roomHost: string;
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

  const [questionDifficulty, setQuestionDifficulty] = useState<string>("");
  const [questionCategory, setQuestionCategory] = useState<string>("mixed");
  const [questionCount, setQuestionCount] = useState(5);
  const [roomCreds, setRoomCreds] = useState<RoomCreds | null>(null);
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomConnectionError, setRoomConnectionError] = useState<string | null>(null);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(true);
  const [joinedAt, setJoinedAt] = useState<number | null>(null);
  const [elapsedLabel, setElapsedLabel] = useState("00:00");
  const [interviewNotes, setInterviewNotes] = useState("");

  const canDispatch =
    sessionType === "framework"
      ? framework !== ""
      : sessionType === "dsa"
        ? dsaLanguage !== ""
        : false;
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
      setIsInRoom(false);
      setRoomCreds(null);
    } catch (err: any) {
      setSessionError(err?.response?.data?.error ?? "Failed to end interview");
    }
  };

  const handleJoinInterview = async () => {
    if (!sessionId) return;
    setJoinError(null);
    setRoomConnectionError(null);
    try {
      const creds = await getRoomTokenAsync(sessionId);
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
    return (
      <InterviewRoomView
        roomCreds={roomCreds}
        hasStarted={hasStarted}
        candidateData={candidateData}
        interviewStatus={interviewStatus}
        isStartingSession={isStartingSession}
        sessionError={sessionError}
        roomConnectionError={roomConnectionError}
        setRoomConnectionError={setRoomConnectionError}
        handleLeaveRoom={handleLeaveRoom}
        handleStartInterview={handleStartInterview}
        elapsedLabel={elapsedLabel}
        isConfigPanelOpen={isConfigPanelOpen}
        setIsConfigPanelOpen={setIsConfigPanelOpen}
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
        sessionId={sessionId}
        questionDifficulty={questionDifficulty}
        onQuestionDifficultyChange={setQuestionDifficulty}
        questionCategory={questionCategory}
        onQuestionCategoryChange={setQuestionCategory}
        questionCount={questionCount}
        onQuestionCountChange={setQuestionCount}
        showEndModal={showEndModal}
        setShowEndModal={setShowEndModal}
        handleEndInterview={handleEndInterview}
        isEndingSession={isEndingSession}
      />
    );
  }

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
