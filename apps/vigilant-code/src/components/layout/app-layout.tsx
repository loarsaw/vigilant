import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useSSE } from "@/hooks/use-sse";
import { useInterview } from "@/hooks/use-session";
import { useEffect } from "react";
import { InterviewCallProvider } from "@/hooks/use-interview-call";
import CallPipWidget from "../call-pip-widget";

interface SessionConfig {
  framework: string;
  level: string;
  language: string;
  type: "dsa" | "framework";
}

export default function AppLayout() {
  const { isAuthenticated, isLoadingUser } = useAuth();
  const { startReporting } = useInterview();

  useEffect(() => {
    if (isAuthenticated) {
      startReporting();
    }
  }, [isAuthenticated]);

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <Outlet />;
}

export function AuthLayout() {
  const { isAuthenticated, isLoadingUser } = useAuth();

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <Outlet />;
}

export function ProtectedLayout() {
  const { isAuthenticated, isLoadingUser } = useAuth();

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return <Outlet />;
}

export function EnvironmentLayout() {
  const router = useNavigate();
  const { interviewRoom } = useAuth();

  // guard: no call credentials -> bounce out before even mounting the provider's Outlet content
  useEffect(() => {
    if (!interviewRoom?.roomToken || !interviewRoom?.roomHost) {
      router("/login", { replace: true });
    }
  }, [interviewRoom, router]);

  useSSE<SessionConfig>({
    type: "session_config",
    handler: (payload) => {
      if (payload.type == "dsa") {
        router(`/editor/${payload.language}`);
      } else {
        router(`/code/${payload.framework.toLowerCase()}`);
      }
    },
  });

  if (!interviewRoom?.roomToken || !interviewRoom?.roomHost) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <InterviewCallProvider>
      <Outlet />
      <CallPipWidget />
    </InterviewCallProvider>
  );
}