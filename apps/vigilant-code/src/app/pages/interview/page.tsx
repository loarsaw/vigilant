import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  VideoConference,
  formatChatMessageLinks,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { ConnectionState } from "livekit-client";
import { useInterviewCall } from "@/hooks/use-interview-call";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InterviewRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { room, connectionState, reconnect } = useInterviewCall();

  useEffect(() => {
    const handleDisconnected = () => {
      navigate(`/interview/${sessionId}/ended`, { replace: true });
    };
    room.on("disconnected", handleDisconnected);
    return () => {
      room.off("disconnected", handleDisconnected);
    };
  }, [room, sessionId, navigate]);

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
      <VideoConference chatMessageFormatter={formatChatMessageLinks} />
      <RoomAudioRenderer />
    </div>
  );
}
