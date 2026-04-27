import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Success from "./success";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function DeepLinkHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, isLoggingIn, loginError, resetLogin, setupPoller, setSessionMeta } = useAuth();
  const [step, setStep] = useState<
    "workspace" | "credentials" | "success" | "waiting" | "processing" | "error"
  >("processing");
  const [workspace, setWorkspace] = useState("");
  const [username, setUsername] = useState("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isRetrying, setIsRetrying] = useState(false);

  const domainName = searchParams.get("domain_name");
  const urlUsername = searchParams.get("username");
  const password = searchParams.get("password");
  const interviewId = searchParams.get("interview_id");

  const getErrorMessage = (error: any) => {
    if (!error) return undefined;

    const status = error.response?.status;

    switch (status) {
      case 401:
        return "The email or password provided is incorrect. Please contact your administrator to verify your credentials.";
      case 403:
        return "Access denied. Your account may be restricted. Please contact your administrator.";
      case 404:
        return "Workspace not found. Please contact your administrator to verify the workspace ID.";
      default:
        return "An unexpected error occurred. Please contact your administrator for assistance.";
    }
  };

  const { data: setupStatus } = setupPoller(workspace, username, step === "waiting");

  if (setupStatus?.assigned && setupStatus.setupPath && step === "waiting") {
    setSessionMeta(workspace, setupStatus.setupPath);
  }

  const performAutoLogin = async () => {
    if (domainName && urlUsername && password) {
      setWorkspace(domainName);
      setUsername(urlUsername);
      setIsRetrying(true);

      try {
        await login({
          workspace: domainName,
          credentials: { username: urlUsername, password },
        });
        setStep("success");
      } catch (error) {
        console.error("Auto-login failed:", error);
        const message = getErrorMessage(error);
        setErrorMessage(message || "Login failed. Please contact your administrator.");
        setStep("error");
      } finally {
        setIsRetrying(false);
      }
    } else {
      setErrorMessage(
        "Invalid login link. Required information is missing. Please contact your administrator.",
      );
      setStep("error");
    }
  };

  useEffect(() => {
    performAutoLogin();
  }, [domainName, urlUsername, password, login]);

  const handleProceedToWaiting = () => {
    if (interviewId) {
      navigate(`/interview/${interviewId}`);
    } else {
      setStep("waiting");
    }
  };

  const handleRetryLogin = () => {
    navigate("/");
  };

  const handleTryAgain = () => {
    setStep("processing");
    setErrorMessage("");
    performAutoLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
      <div className="absolute top-10 left-10 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" />
      <div
        className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute top-1/2 right-1/4 w-72 h-72 bg-blue-700 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      <div className="relative z-10 w-full max-w-md px-4 flex items-center justify-center">
        {/* Processing */}
        {step === "processing" && (
          <div className="w-full bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-300 text-lg">Signing you in...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="w-full bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-red-700/50 p-8">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Login Failed</h2>
                <p className="text-slate-300 text-base leading-relaxed">{errorMessage}</p>
              </div>
              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={handleTryAgain}
                  disabled={isRetrying}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {isRetrying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </>
                  )}
                </button>
                <button
                  onClick={handleRetryLogin}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Go to Login Page
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        <div
          className={`w-full transition-all duration-700 ease-out absolute ${
            step === "success"
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-8 pointer-events-none"
          }`}
        >
          <Success workspace={workspace} username={username} onProceed={handleProceedToWaiting} />
        </div>

        {/* Waiting fallback (no interview_id) */}
        {step === "waiting" && (
          <div className="w-full bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-300 text-lg">Setting up your workspace...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}