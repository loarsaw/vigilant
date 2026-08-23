// link-handler.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

export default function DeepLinkHandler() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithToken } = useAuth();
  const [status, setStatus] = useState<"authenticating" | "error">("authenticating");
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      const domainName = searchParams.get("domain_name") || "";
      const username = searchParams.get("username") || "";
      const password = searchParams.get("password");
      const candidateJwt = searchParams.get("candidate_jwt");
      const sessionId = searchParams.get("session_id");
      const livekitToken = searchParams.get("livekit_token");
      const livekitHost = searchParams.get("livekit_host");

      if (!domainName || !username) {
        setError("Missing required login parameters.");
        setStatus("error");
        return;
      }

      try {
        if (candidateJwt) {
          // NEW: interview-invite flow — candidate_jwt is already a valid
          // access token, no credential exchange needed. loginWithToken
          // sets baseURL + auth header, then confirms via /auth/me.
          await loginWithToken({ workspace: domainName, token: candidateJwt });
        } else if (password) {
          // EXISTING: normal username/password login.
          await login({ workspace: domainName, credentials: { username, password } });
        } else {
          throw new Error("No valid credential provided.");
        }

        // If this invite carries an interview session + LiveKit connection
        // details, route straight into the room instead of the dashboard.
        if (sessionId && livekitToken && livekitHost) {
          navigate(
            `/interview/${sessionId}?livekit_token=${encodeURIComponent(livekitToken)}&livekit_host=${encodeURIComponent(livekitHost)}`,
            { replace: true }
          );
          return;
        }

        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("DeepLinkHandler auth error:", err);
        setError(err instanceof Error ? err.message : "Failed to authenticate.");
        setStatus("error");
      }
    };

    run();
  }, []);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center text-white">
          <p className="text-red-400 mb-2">{error}</p>
          <button onClick={() => navigate("/")} className="text-blue-400 underline">
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <p className="text-white">Signing you in…</p>
    </div>
  );
} 