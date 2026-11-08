import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";

export interface RoomConnectionErrorModalProps {
  roomConnectionError: string;
  setRoomConnectionError: (error: string | null) => void;
  handleLeaveRoom: () => void;
}

export const RoomConnectionErrorModal: React.FC<RoomConnectionErrorModalProps> = ({
  roomConnectionError,
  setRoomConnectionError,
  handleLeaveRoom,
}) => {
  return (
    <div className="dark min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="flex justify-center">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Couldn't join the interview</h2>
        <p className="text-sm text-muted-foreground">{roomConnectionError}</p>
        <div className="flex gap-2">
          <Button
            onClick={() => setRoomConnectionError(null)}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            Try again
          </Button>
          <Button
            variant="ghost"
            onClick={handleLeaveRoom}
            className="w-full py-2.5 rounded-xl text-muted-foreground hover:bg-accent"
          >
            Back to details
          </Button>
        </div>
      </div>
    </div>
  );
};
