import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { Room, RoomEvent, ConnectionState } from "livekit-client";
import { RoomContext } from "@livekit/components-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { InterviewCallContextValue } from "./types";

export const InterviewCallContext = createContext<InterviewCallContextValue | null>(null);

const ROOM_PATH_RE = /^\/interview\/[^/]+\/room$/;

export function InterviewCallProvider({ children }: { children: ReactNode }) {
  const { interviewRoom } = useAuth();
  const location = useLocation();

  const roomRef = useRef<Room>();
  if (!roomRef.current) {
    roomRef.current = new Room({ adaptiveStream: true, dynacast: true });
  }
  const room = roomRef.current;

  const [connectionState, setConnectionState] = useState<ConnectionState>(room.state);
  const [roomPath, setRoomPath] = useState<string | null>(null);

  useEffect(() => {
    if (ROOM_PATH_RE.test(location.pathname)) {
      setRoomPath(location.pathname);
    }
  }, [location.pathname]);

  useEffect(() => {
    const onState = () => setConnectionState(room.state);
    room.on(RoomEvent.ConnectionStateChanged, onState);
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, onState);
    };
  }, [room]);

  useEffect(() => {
    if (!interviewRoom?.roomToken || !interviewRoom?.roomHost) return;
    if (room.state !== ConnectionState.Disconnected) return;

    const serverUrl = interviewRoom.roomHost.startsWith("ws")
      ? interviewRoom.roomHost
      : `wss://${interviewRoom.roomHost}`;

    room
      .connect(serverUrl, interviewRoom.roomToken)
      .then(() => {
        room.localParticipant.setCameraEnabled(true);
        room.localParticipant.setMicrophoneEnabled(true);
      })
      .catch((err) => {
        console.error("[LiveKit] connection error:", err);
      });
  }, [interviewRoom?.roomToken, interviewRoom?.roomHost, room]);

  useEffect(() => {
    return () => {
      room.disconnect();
    };
  }, [room]);

  const reconnect = () => {
    if (!interviewRoom?.roomToken || !interviewRoom?.roomHost) return;
    const serverUrl = interviewRoom.roomHost.startsWith("ws")
      ? interviewRoom.roomHost
      : `wss://${interviewRoom.roomHost}`;
    room.connect(serverUrl, interviewRoom.roomToken);
  };

  const value = useMemo<InterviewCallContextValue>(
    () => ({
      room,
      connectionState,
      disconnect: () => room.disconnect(),
      reconnect,
      roomPath,
    }),
    [room, connectionState, roomPath],
  );

  return (
    <InterviewCallContext.Provider value={value}>
      <RoomContext.Provider value={room}>{children}</RoomContext.Provider>
    </InterviewCallContext.Provider>
  );
}

export function useInterviewCall() {
  const ctx = useContext(InterviewCallContext);
  if (!ctx) {
    throw new Error("useInterviewCall must be used inside InterviewCallProvider");
  }
  return ctx;
}
