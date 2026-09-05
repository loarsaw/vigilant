import { useState } from "react";
import WorkspaceEntry from "./workspace";
import Success from "./success";
import { useAuth } from "@/hooks/use-auth";
import { LoginCodePanel } from "@/components/code-panel";

export default function LoginPage() {
  const { verifyPasscode, isVerifyingPasscode, verifyPasscodeError, resetVerifyPasscode, interviewRoom } =
    useAuth();
  const [step, setStep] = useState<"workspace" | "code" | "success">("workspace");
  const [workspace, setWorkspace] = useState("");

  const getErrorMessage = (error: any) => {
    if (!error) return undefined;

    const status = error.response?.status;

    switch (status) {
      case 400:
        return "That passcode isn't valid yet — try again closer to your interview time.";
      case 404:
        return "Invalid passcode. Please check the code from your invite email.";
      case 410:
        return "This passcode has expired. Please contact your recruiter for a new one.";
      default:
        return "An unexpected error occurred. Please try again later.";
    }
  };

  const handleWorkspaceSubmit = (value: string) => {
    setWorkspace(value);
    setStep("code");
  };

  const handleBackClick = () => {
    resetVerifyPasscode();
    setStep("workspace");
  };

  const handleCodeSubmit = async (code: string) => {
    try {
      await verifyPasscode({ workspace, passcode: code });
      setStep("success");
    } catch {
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-10 left-10 w-80 h-80 bg-[hsl(var(--chart-1))] rounded-full mix-blend-screen filter blur-3xl opacity-15 animate-pulse" />
      <div
        className="absolute bottom-10 right-10 w-96 h-96 bg-[hsl(var(--chart-2))] rounded-full mix-blend-screen filter blur-3xl opacity-15 animate-pulse"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute top-1/2 right-1/4 w-72 h-72 bg-primary rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      <div className="relative z-10 w-full max-w-md px-4 flex items-center justify-center">
        <div
          className={`w-full transition-all duration-700 ease-out absolute ${step === "workspace" ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-8 pointer-events-none"}`}
        >
          <WorkspaceEntry onSubmit={handleWorkspaceSubmit} />
        </div>

        <div
          className={`w-full transition-all duration-700 ease-out absolute ${step === "code" ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-8 pointer-events-none"}`}
        >
          <LoginCodePanel
            onSubmit={handleCodeSubmit}
            isSubmitting={isVerifyingPasscode}
            errorMessage={getErrorMessage(verifyPasscodeError)}
          />
          <button
            type="button"
            onClick={handleBackClick}
            className="mt-4 text-xs font-display font-semibold tracking-wide text-muted-foreground hover:text-foreground hover:underline w-full text-center"
          >
            Back to workspace
          </button>
        </div>

        <div
          className={`w-full transition-all duration-700 ease-out absolute ${step === "success" ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-8 pointer-events-none"}`}
        >
          <Success
            workspace={workspace}
            sessionId={interviewRoom?.sessionId ?? ""}
          />
        </div>
      </div>
    </div>
  );
}