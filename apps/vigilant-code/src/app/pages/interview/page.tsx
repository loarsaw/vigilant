import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  VideoConference,
  formatChatMessageLinks,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { ConnectionState, RoomEvent } from "livekit-client";
import { useInterviewCall } from "@/hooks/use-interview-call";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InterviewRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { room, connectionState, reconnect } = useInterviewCall();
  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    const handleDisconnected = () => {
      navigate(`/interview/${sessionId}/ended`, { replace: true });
    };

    const handleMediaDevicesError = (error: Error) => {
      console.error("[LiveKit] Media device error:", error);
      setMediaError(
        "Screen sharing failed. This can happen if the share dialog was closed or your system blocked screen capture."
      );
    };

    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.MediaDevicesError, handleMediaDevicesError);

    return () => {
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(RoomEvent.MediaDevicesError, handleMediaDevicesError);
    };
  }, [room, sessionId, navigate]);

  // Belt-and-braces: catch any remaining unhandled rejection in this
  // renderer window so a stray promise (e.g. from getDisplayMedia)
  // can never silently kill the window.
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[renderer] Unhandled promise rejection:", event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  if (
    connectionState === ConnectionState.Connecting ||
    connectionState === ConnectionState.Reconnecting
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (connectionState === ConnectionState.Disconnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="flex justify-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Couldn't join the interview</h2>
          <p className="text-sm text-slate-400">
            We couldn't connect to the interview room. Please check your connection and try again.
          </p>
          <Button
            onClick={reconnect}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-lk-theme="default"
      className="lk-room-container h-screen w-screen bg-slate-950"
      style={{ height: "100%" }}
    >
      {mediaError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {mediaError}
          <button
            onClick={() => setMediaError(null)}
            className="ml-2 text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
      <VideoConference chatMessageFormatter={formatChatMessageLinks} />
      <RoomAudioRenderer />
    </div>
  );
}