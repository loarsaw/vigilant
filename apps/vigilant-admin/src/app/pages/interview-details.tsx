import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Mail,
  Phone,
  Award,
  FileText,
  Send,
  Loader2,
  Zap,
  Code2,
  Layers,
  Square,
  AlertTriangle,
  JoystickIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type SessionType = "dsa" | "framework" | "";
type DSALanguage = "C" | "C++" | "Python" | "Java";



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

  const canDispatch =
    sessionType === "framework"
      ? level !== "" && framework !== ""
      : sessionType === "dsa"
        ? dsaLanguage !== ""
        : false;

  useEffect(() => {
    if (sessionStatus) {
      setInterviewStatus(sessionStatus);
    }
  }, [sessionStatus]);

  // const handleSendLoginLink = async () => {
  //   try {
  //     await sendEmailAsync({
  //       sessionId,
  //       payload: { email_type: "start" },
  //     });
  //   } catch (error) {}
  // };

  useEffect(() => {
    const nextInterview = sessions
      .filter((session) => session.status === "scheduled" && session.is_upcoming)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

    if (nextInterview && nextInterview?.is_upcoming) {
      setUpcoming(nextInterview.is_upcoming);
    }
  }, [sessions]);

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
    } catch (err: any) {
      setSessionError(err?.response?.data?.error ?? "Failed to end interview");
    }
  };

  // Fetches the interviewer's own LiveKit room token (see
  // AdminHandlers.GetInterviewerRoomToken) and navigates into the room
  // inside this app — no more opening an external interview_url.
  const handleJoinInterview = async () => {
    if (!sessionId) return;
    setJoinError(null);
    try {
      await getRoomTokenAsync(sessionId);
      navigate(`/interview/${sessionId}/room`);
    } catch (err: any) {
      setJoinError(err?.response?.data?.error ?? "Failed to join interview room");
    }
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
              <h1 className="font-display text-[28px] font-bold tracking-wide text-foreground">
                {candidateData.full_name}
              </h1>
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
          </div>

          <div className="space-y-6">
            <Card className="relative border-border/60">
              <BracketCorners tone="primary" />
              <CardHeader>
                <CardTitle className="font-display text-lg tracking-wide">Quick Actions</CardTitle>
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
                {(joinError || roomTokenError) && (
                  <p className="text-xs text-[hsl(var(--destructive))]">
                    {joinError ?? roomTokenError}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg tracking-wide text-primary">
                  <Zap className="w-5 h-5" />
                  Session Configuration
                </CardTitle>
                <CardDescription>
                  Choose a session type, configure options, then dispatch to candidate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">
                    Session Type
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSessionTypeChange("dsa")}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        sessionType === "dsa"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-input/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      <Code2 className="w-5 h-5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">DSA</p>
                        <p className="text-xs opacity-70">Data Structures & Algorithms</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSessionTypeChange("framework")}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        sessionType === "framework"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-input/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      <Layers className="w-5 h-5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">Framework</p>
                        <p className="text-xs opacity-70">React / Next.js assessment</p>
                      </div>
                    </button>
                  </div>
                </div>

                {sessionType === "dsa" && (
                  <div className="space-y-2">
                    <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">
                      Programming Language
                    </p>
                    <Select
                      value={dsaLanguage}
                      onValueChange={(v) => {
                        setDsaLanguage(v as DSALanguage);
                        setDispatched(false);
                      }}
                    >
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Select language..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="C++">C++</SelectItem>
                        <SelectItem value="Python">Python</SelectItem>
                        <SelectItem value="Java">Java</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {sessionType === "framework" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">
                        Target Framework
                      </p>
                      <Select
                        value={framework}
                        onValueChange={(v) => {
                          setFramework(v as Framework);
                          setDispatched(false);
                        }}
                      >
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue placeholder="Select framework..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="React">React</SelectItem>
                          <SelectItem value="Nextjs">Next.js</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">
                        Difficulty Level
                      </p>
                      <Select
                        value={level}
                        onValueChange={(v) => {
                          setLevel(v as CandidateLevel);
                          setDispatched(false);
                        }}
                      >
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue placeholder="Select level..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Intern">Intern</SelectItem>
                          <SelectItem value="Junior">Junior</SelectItem>
                          <SelectItem value="Senior">Senior</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <Button
                    onClick={handleDispatch}
                    disabled={!canDispatch || isDispatching}
                    className="font-display font-semibold tracking-wide flex items-center gap-2"
                  >
                    {isDispatching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {isDispatching ? "Dispatching..." : "Dispatch to Candidate"}
                  </Button>

                  {!canDispatch && sessionType !== "" && (
                    <p className="text-xs text-muted-foreground">
                      {sessionType === "dsa"
                        ? "Select a language to dispatch"
                        : "Select both framework and level to dispatch"}
                    </p>
                  )}
                  {!sessionType && (
                    <p className="text-xs text-muted-foreground">Select a session type to begin</p>
                  )}
                  {dispatched && canDispatch && (
                    <Badge className="font-display font-semibold tracking-wide bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] border border-[hsl(var(--chart-4)/0.3)]">
                      {sessionType === "dsa"
                        ? `Dispatched — DSA / ${dsaLanguage}`
                        : `Dispatched — ${framework} / ${level}`}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {sessionId && (interviewStatus === "in_progress" || interviewStatus === "completed") && (
          <ScoreEvaluator interviewSessionId={sessionId} />
        )}
      </div>
    </div>
  );
}