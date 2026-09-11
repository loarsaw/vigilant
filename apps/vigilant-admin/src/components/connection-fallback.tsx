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
            className="w-full py-2.5 rounded-xl text-slate-300 hover:bg-slate-800"
          >
            Back to details
          </Button>
        </div>
      </div>
    </div>
  );
};
