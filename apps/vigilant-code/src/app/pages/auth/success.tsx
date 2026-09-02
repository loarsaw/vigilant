import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Loader2, Camera, Wifi, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/axios";

interface SuccessProps {
  workspace: string;
  sessionId: string;
}

type CheckStatus = "checking" | "pass" | "fail";
type NetworkQuality = "good" | "fair" | "poor" | null;

const HEALTH_CHECK_ATTEMPTS = 4;
const GOOD_LATENCY_MS = 150;
const FAIR_LATENCY_MS = 400;

export default function Success({ workspace, sessionId }: SuccessProps) {
  const router = useNavigate();
  const { interviewRoom } = useAuth();

  const [cameraStatus, setCameraStatus] = useState<CheckStatus>("checking");
  const [networkStatus, setNetworkStatus] = useState<CheckStatus>("checking");
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>(null);
  const [avgLatency, setAvgLatency] = useState<number | null>(null);

  const runCameraCheck = useCallback(async () => {
    setCameraStatus("checking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setCameraStatus("pass");
    } catch {
      setCameraStatus("fail");
    }
  }, []);

  const runNetworkCheck = useCallback(async () => {
    setNetworkStatus("checking");

    if (!navigator.onLine) {
      setNetworkStatus("fail");
      setNetworkQuality(null);
      setAvgLatency(null);
      return;
    }

    // /health is registered at root (r.Group("/")), not under /api/v1, so
    // this can't reuse apiClient's baseURL — build the root URL explicitly
    // from whatever origin apiClient is currently pointed at.
    const baseURL = apiClient.defaults.baseURL ?? "";
    const rootURL = baseURL.replace(/\/api\/v1\/?$/, "");

    const samples: number[] = [];
    for (let i = 0; i < HEALTH_CHECK_ATTEMPTS; i++) {
      const start = performance.now();
      try {
        await fetch(`${rootURL}/health?_=${Date.now()}`);
        samples.push(performance.now() - start);
      } catch {
        // one failed round trip is fine, keep sampling
      }
    }

    if (samples.length === 0) {
      setNetworkStatus("fail");
      setNetworkQuality(null);
      setAvgLatency(null);
      return;
    }

    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    setAvgLatency(Math.round(avg));
    setNetworkQuality(avg <= GOOD_LATENCY_MS ? "good" : avg <= FAIR_LATENCY_MS ? "fair" : "poor");
    setNetworkStatus("pass");
  }, []);

  useEffect(() => {
    runCameraCheck();
    runNetworkCheck();
  }, [runCameraCheck, runNetworkCheck]);

  const bothPassed = cameraStatus === "pass" && networkStatus === "pass";
  const anyChecking = cameraStatus === "checking" || networkStatus === "checking";

  const handleProceed = () => {
    router(`/interview/${sessionId}/room`);
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="text-center space-y-8">
        <div className="flex justify-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg animate-pulse">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-white mb-3 text-balance">Passcode verified</h2>
          <p className="text-lg text-slate-300 font-light">
            You're set to join your interview on{" "}
            <span className="font-semibold text-blue-400">{workspace}</span>
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4 text-left">
          <CheckRow
            icon={<Camera className="w-4 h-4" />}
            label="Camera access"
            status={cameraStatus}
            detail={
              cameraStatus === "fail" ? "Camera permission was denied or unavailable" : undefined
            }
            onRetry={runCameraCheck}
          />
          <CheckRow
            icon={<Wifi className="w-4 h-4" />}
            label="Connection"
            status={networkStatus}
            detail={
              networkStatus === "pass" && avgLatency !== null
                ? `${networkQuality === "good" ? "Good" : networkQuality === "fair" ? "Fair" : "Poor"} · ${avgLatency}ms avg`
                : networkStatus === "fail"
                  ? "Couldn't reach the server. Check your connection."
                  : undefined
            }
            onRetry={runNetworkCheck}
          />
        </div>

        {networkStatus === "pass" && networkQuality === "poor" && (
          <p className="text-sm text-amber-400">
            Your connection looks slow — video quality during the interview may be affected.
          </p>
        )}

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <p className="text-slate-300 text-sm leading-relaxed">
            You are now authenticated. Once you join the lobby, running process data will be shared
            with the workspace admin for interview transparency.
          </p>
        </div>

        <Button
          onClick={handleProceed}
          disabled={!interviewRoom?.roomToken || !bothPassed || anyChecking}
          className="w-full py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {anyChecking ? "Running checks..." : "Ready To Join"}
        </Button>
      </div>
    </div>
  );
}

function CheckRow({
  icon,
  label,
  status,
  detail,
  onRetry,
}: {
  icon: React.ReactNode;
  label: string;
  status: CheckStatus;
  detail?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <span className="text-slate-400 mt-0.5">{icon}</span>
        <div>
          <p className="text-sm text-slate-200 font-medium">{label}</p>
          {detail && (
            <p
              className={`text-xs mt-0.5 ${status === "fail" ? "text-red-400" : "text-slate-400"}`}
            >
              {detail}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {status === "checking" && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
        {status === "pass" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
        {status === "fail" && (
          <>
            <XCircle className="w-4 h-4 text-red-400" />
            <button
              type="button"
              onClick={onRetry}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label={`Retry ${label} check`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
