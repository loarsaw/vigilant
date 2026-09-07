// app/pages/interview-room.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LiveKitRoom,
  VideoConference,
  formatChatMessageLinks,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CandidateLevel, Framework } from "@/types/types";
import {
  DSALanguage,
  SessionConfigurationCard,
  SessionType,
} from "@/components/session-configuration";

interface AdminRoomData {
  sessionId: string;
  roomToken: string;
  roomHost: string;
}

export default function AdminInterviewRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // --- session configuration state (moved here from wherever this card lived before joining the room) ---
  const [sessionType, setSessionType] = useState<SessionType>("");
  const [dsaLanguage, setDsaLanguage] = useState<DSALanguage | "">("");
  const [framework, setFramework] = useState<Framework | "">("");
  const [level, setLevel] = useState<CandidateLevel | "">("");
  const [dispatched, setDispatched] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  const canDispatch =
    sessionType === "dsa"
      ? !!dsaLanguage
      : sessionType === "framework"
        ? !!framework && !!level
        : false;

  const handleDispatch = async () => {
    if (!canDispatch || !sessionId) return;
    setIsDispatching(true);
    try {
      // TODO: wire this to your actual dispatch endpoint/socket call
      // e.g. await api.post(`/interviews/${sessionId}/dispatch`, { sessionType, dsaLanguage, framework, level });
      setDispatched(true);
    } catch (err) {
      console.error("[Admin] dispatch failed:", err);
    } finally {
      setIsDispatching(false);
    }
  };
  // ---------------------------------------------------------------------------------------------------

  const adminRoom = queryClient.getQueryData<AdminRoomData>(["interview", "admin-room"]);

  useEffect(() => {
    if (!adminRoom?.roomToken || !adminRoom?.roomHost) {
      navigate(sessionId ? `/interviews/${sessionId}` : "/interviews", { replace: true });
    }
  }, [adminRoom, navigate, sessionId]);

  if (!adminRoom?.roomToken || !adminRoom?.roomHost) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  const serverUrl = adminRoom.roomHost.startsWith("ws")
    ? adminRoom.roomHost
    : `wss://${adminRoom.roomHost}`;

  const handleDisconnected = () => {
    navigate("/interviews", { replace: true });
  };

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="flex justify-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Couldn't join the interview</h2>
          <p className="text-sm text-slate-400">{connectionError}</p>
          <Button
            onClick={() => setConnectionError(null)}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden relative">
      {/* Video area */}
      <div
        data-lk-theme="default"
        className="lk-room-container flex-1 min-w-0 h-full flex flex-col"
      >
        <LiveKitRoom
          video
          audio
          token={adminRoom.roomToken}
          serverUrl={serverUrl}
          data-lk-theme="default"
          style={{ height: "100%" }}
          onDisconnected={handleDisconnected}
          onError={(err) => {
            console.error("[LiveKit] admin connection error:", err);
            setConnectionError(
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

      {/* Toggle arrow — sits on the edge of the panel, flips direction based on open state */}
      <button
        type="button"
        onClick={() => setIsPanelOpen((v) => !v)}
        aria-label={isPanelOpen ? "Close session panel" : "Open session panel"}
        className={`absolute top-1/2 -translate-y-1/2 z-30 flex items-center justify-center
          w-7 h-14 rounded-l-md bg-secondary border border-border/60 border-r-0
          text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all
          ${isPanelOpen ? "right-[380px]" : "right-0"}`}
      >
        {isPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Slide-out configuration panel */}
      <div
        className={`h-full bg-background border-l border-border/60 shrink-0 overflow-y-auto
          transition-[width] duration-300 ease-in-out
          ${isPanelOpen ? "w-[380px]" : "w-0"}`}
      >
        {/* fixed inner width so content doesn't reflow/squish mid-animation */}
        <div className="w-[380px] p-4">
          <SessionConfigurationCard
            sessionType={sessionType}
            dsaLanguage={dsaLanguage}
            framework={framework}
            level={level}
            dispatched={dispatched}
            isDispatching={isDispatching}
            canDispatch={canDispatch}
            onSessionTypeChange={setSessionType}
            onDsaLanguageChange={setDsaLanguage}
            onFrameworkChange={setFramework}
            onLevelChange={setLevel}
            onDispatch={handleDispatch}
          />
        </div>
      </div>
    </div>
  );
}
