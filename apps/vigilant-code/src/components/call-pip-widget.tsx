import { useContext, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { InterviewCallContext } from "@/hooks/use-interview-call";

function CallPipWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const ctx = useContext(InterviewCallContext);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isRoomPage = /^\/interview\/[^/]+\/room$/.test(location.pathname);

  useEffect(() => {
    if (!ctx || isRoomPage) return;

    const pub = Array.from(ctx.room.localParticipant.videoTrackPublications.values())[0];
    const track = pub?.videoTrack;
    if (track && videoRef.current) {
      track.attach(videoRef.current);
    }
    return () => {
      track?.detach();
    };
  }, [ctx, isRoomPage]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !ctx) return;

    const handleLeavePiP = () => {
      if (ctx.roomPath) {
        navigate(ctx.roomPath);
      }
    };

    videoEl.addEventListener("leavepictureinpicture", handleLeavePiP);
    return () => {
      videoEl.removeEventListener("leavepictureinpicture", handleLeavePiP);
    };
  }, [ctx, navigate]);

  if (!ctx || isRoomPage) return null;

  return (
    <div className="fixed bottom-4 right-4 w-56 h-32 rounded-lg overflow-hidden shadow-xl z-50 bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      <button
        onClick={() => videoRef.current?.requestPictureInPicture()}
        className="absolute top-1 right-1 text-xs bg-black/60 text-white px-2 py-1 rounded"
      >
        Pop out
      </button>
    </div>
  );
}

export default CallPipWidget;
