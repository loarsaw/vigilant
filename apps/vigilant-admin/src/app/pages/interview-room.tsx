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
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="h-screen w-screen bg-slate-950">
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
        <VideoConference chatMessageFormatter={formatChatMessageLinks} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
